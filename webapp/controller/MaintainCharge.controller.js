sap.ui.define([
    //"sap/ui/core/mvc/Controller",
    "./BaseController",
    "com/sap/fiorichargeapp/model/DataManager",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/ColumnListItem",
    "sap/m/Input",
    "sap/m/ObjectStatus",
    'sap/base/util/deepExtend',
    'sap/ui/core/ValueState',
    'sap/m/MessageBox',
    'sap/ui/core/Fragment',
    'sap/ui/Device',
    'sap/m/TimePicker',
    'sap/m/MessageToast'
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
    function (BaseController,DataManager, JSONModel, Filter, FilterOperator, ColumnListItem, Input, ObjectStatus, 
        deepExtend, ValueState, MessageBox,Fragment,Device,TimePicker,MessageToast) {
        "use strict";

        return BaseController.extend("com.sap.fiorichargeapp.controller.MaintainCharge", {
            onInit: function () {
                this.oRouter = new sap.ui.core.UIComponent.getRouterFor(this);
                this._oBusyIndicator = new sap.m.BusyDialog();
                 var oFilterModel = new JSONModel({
                    Stores: [],
                    Departments: [],
                    Batches: [],
                    BatchesCentralStore:[]
                });
                this.getView().setModel(oFilterModel, "LocalModel");
                
                this.oReadOnlyTemplate = this.byId("tbCharge").getBindingInfo("items").template;//this.byId("tbCharge").removeItem(0);
                this.initializeEditableTemplate();
                this.oRouter.attachRouteMatched(this.onRouteMatched, this);
            },

            onRouteMatched: function (oEvent) {
                var oNameParameter = oEvent.getParameter("name");
                
                   this.clearValues();
                    this.loadStores();
            },

            loadStores: function () {

                var oLocalModel = this.getView().getModel("LocalModel");
                var oModel = this.getOwnerComponent().getModel();//this.getView().getModel();
                var filter=[];
                
                filter.push(new Filter("StoreID", FilterOperator.NE, '9999'));

                var urlParameter = {};

                DataManager.read(oModel,"/Stores",filter,urlParameter,jQuery.proxy(function(oData) {
                    oLocalModel.setProperty("/Stores", oData.results);
                },this), jQuery.proxy(function(oError){
                    MessageToast.show(oError);
                },this));
             },

            loadDepartment: function (filterDep) {
                var oLocalModel = this.getView().getModel("LocalModel");
                var oModel = this.getOwnerComponent().getModel();//this.getView().getModel();

                var urlParameter = {};
                var filter = filterDep;
                DataManager.read(oModel,"/Departments",filter,urlParameter,jQuery.proxy(function(oData) {
                    oLocalModel.setProperty("/Departments", oData.results);
                },this), jQuery.proxy(function(oError){
                    MessageToast.show(oError);
                    this.loadDepartmentDeferred.reject();
                },this));
            },

            handleStoreChange: function (oEvent) {
                var that = this;
                var oView = that.getView();
                var filter = [];

                var oLocalModel = oView.getModel("LocalModel");
                var oModel = that.getOwnerComponent().getModel();

                var selectedStore = oEvent.oSource.getSelectedKey();
                var cbDepartment = oView.byId("cbDepartment");
                
                that.changeButtonVisibility("storeChange");
                cbDepartment.setValue(" ");
                oLocalModel.setProperty("/Departments",[]);
                oLocalModel.setProperty("/Batches",[]);
                oLocalModel.setProperty("/BatchesCentralStore",[])

                if (selectedStore.length > 0) {
                    filter = [new sap.ui.model.Filter("StoreID", sap.ui.model.FilterOperator.EQ, selectedStore)];
                }

                var urlParameter = {};
                //when data model for StoresToDepartments will be changed to association to Store and drpartment,
                //expand will be used to read the department details
                var fnSuccess = function(oData){
                    if(oData.results.length>0){
                        var filterDep=[];
                        for (var i = 0; i < oData.results.length; i++) {
                            filterDep.push(new Filter("DepartmentID" , FilterOperator.EQ, oData.results[i].DepartmentID));
                        }
                        that.loadDepartment(filterDep);
                    }else{
                        oLocalModel.setProperty("/Departments",[]);/// will be implemented in diffrent way in actualu project
                    }    
                };

                var fnError= function(oError){
                    MessageToast.show(oError);
                };    
                DataManager.read(oModel,"/StoresToDepartments",filter,urlParameter,fnSuccess, fnError);
            },

            handleOnSearch: function (oEvent) {

                var oView = this.getView();
                var oModel = this.getOwnerComponent().getModel();
                var i18nModel = this.getModel("i18n").getResourceBundle();
                var oLocalModel = oView.getModel("LocalModel");
                
                var cbStore = oView.byId("cbStore");
                var cbDepartment = oView.byId("cbDepartment");

                var strStore = cbStore.getSelectedKey();
                var strDepartmentID = cbDepartment.getSelectedKey();

                if(strStore !== "" && strDepartmentID != ""){
                    oLocalModel.setProperty("/Batches",[]);
                    oLocalModel.setProperty("/BatchesCentralStore",[])

                    this.loadStoreSpecificBatches(strStore, strDepartmentID);

                    $.when(this.loadStoreSpecBatchesDeferred).done($.proxy(function() {
                        if(oLocalModel.getProperty("/Batches").length === 0){
                            this.loadCentralStoreCharge();
                            $.when(this.loadCentralStoreDeferred).done($.proxy(function() {
                                var data =oLocalModel.getProperty("/BatchesCentralStore");
                                if(data.length >0){
                                    var tempArr = this.adjustBatchDataStructure(data);
                                    oLocalModel.setProperty("/Batches", tempArr);
                                    this.rebindTable(this.oEditableTemplate, "Edit");  
                                    this.changeButtonVisibility("search"); 
                                    oView.byId("createChargeButton").setVisible(true);
                                }else{
                                    this.changeButtonVisibility("search"); 
                                }    
                            }, this));        
                        }else{
                            this.updateTableTitle(); 
                            this.byId("editButton").setVisible(true);
                            this.byId("createChargeButton").setVisible(false);
                        }
                    }, this));       
                }else{
                    if(strStore === "")
                        MessageBox.warning(i18nModel.getText("Message_Warning_Store"));
                    else
                        MessageBox.warning(i18nModel.getText("Message_Warning_Department"));    
                }   
            },

            loadStoreSpecificBatches:function (strStore, strDepartmentID){
                this.loadStoreSpecBatchesDeferred = $.Deferred();
                var oView = this.getView();
                var oModel = this.getOwnerComponent().getModel();
                var oLocalModel = oView.getModel("LocalModel");
                
                var storeFilter = new Filter("Store_StoreID", FilterOperator.EQ, strStore);
                var depFilter = new Filter("Department_DepartmentID", FilterOperator.EQ, strDepartmentID);

                var filter = []
                filter.push(storeFilter);
                filter.push(depFilter);

                var expand = "Store,Department";
                var urlParameter = {
                    "$expand": expand,
                    "$orderby":"BatchID"
                };
                DataManager.read(oModel,"/Batches",filter,urlParameter,jQuery.proxy(function(oData) {
                    for (var i = 0; i < oData.results.length; i++) {
                        oData.results[i].UpdatedBatch = false;
                        oData.results[i].ValueStateMonday = oData.results[i].Changed_Monday === false?"Success":"Warning";
                        oData.results[i].ValueStateTuesday = oData.results[i].Changed_Tuesday === false?"Success":"Warning";
                        oData.results[i].ValueStateWednesday = oData.results[i].Changed_Wednesday === false?"Success":"Warning";
                        oData.results[i].ValueStateThursday = oData.results[i].Changed_Thursday === false?"Success":"Warning";
                        oData.results[i].ValueStateFriday = oData.results[i].Changed_Friday === false?"Success":"Warning";
                        oData.results[i].ValueStateSaturday = oData.results[i].Changed_Saturday === false?"Success":"Warning";
                        oData.results[i].ValueStateSunday = oData.results[i].Changed_Sunday === false?"Success":"Warning";
                    }
                    oLocalModel.setProperty("/Batches", oData.results);
                    this.updateTableTitle(); 
                    this.loadStoreSpecBatchesDeferred.resolve();

                },this), jQuery.proxy(function(oError){
                    MessageToast.show(oError);
                    this.loadStoreSpecBatchesDeferred.reject();

                },this)); 

            },

            loadCentralStoreCharge:function(){

                this.loadCentralStoreDeferred = $.Deferred();
                var oView = this.getView();
                var oLocalModel = oView.getModel("LocalModel");
                var oModel = this.getOwnerComponent().getModel();//this.getView().getModel();

                var strDepartmentID = oView.byId("cbDepartment").getSelectedKey();
                
                var storeFilter = new Filter("Store_StoreID", FilterOperator.EQ, '9999');
                var deptFilter = new Filter("Department_DepartmentID", FilterOperator.EQ, strDepartmentID);

                var filter = []
                filter.push(storeFilter);
                filter.push(deptFilter);

                var expand = "Store,Department";

                var urlParameter = {
                    "$expand": expand,
                    "$orderby":"BatchID"
				};

                DataManager.read(oModel,"/Batches",filter,urlParameter,jQuery.proxy(function(oData) {    
                    oLocalModel.setProperty("/BatchesCentralStore", oData.results);
                    this.loadCentralStoreDeferred.resolve();
                },this), jQuery.proxy(function(oError){
                   this.loadCentralStoreDeferred.reject();     
                },this));
            },

            updateTableTitle:function(){
                var oView = this.getView();
                var oLocalModel = oView.getModel("LocalModel");
                
                var strStore = oView.byId("cbStore").getSelectedKey();
                var strDepartmentDesc = oView.byId("cbDepartment").getValue();
                oView.byId("tbHeaderTitle").setText("Store : " + strStore + " - " + strDepartmentDesc);
            },

            initializeEditableTemplate: function () {
                this.oEditableTemplate = new ColumnListItem({
                    cells: [
                        new ObjectStatus({
                            text: "{LocalModel>BatchID}"
                        }),
                        new TimePicker({
                            id:"tpMon",
                            valueState: "{LocalModel>ValueStateMonday}",
                            valueStateText:"{LocalModel>ValueStateText}",
                            valueFormat:"HH:mm:ss",
                            displayFormat:"HH:mm:ss",
                            change:this.handleChange,
                            support2400:true,
                            value:"{path :'LocalModel>Time_Monday', type: 'sap.ui.model.odata.type.Time'}"   
                        }),
                        new TimePicker({
                            id:"tpTues",
                            valueState: "{LocalModel>ValueStateTuesday}",
                            valueFormat:"HH:mm:ss",
                            displayFormat:"HH:mm:ss",
                            change:this.handleChange,
                            support2400:true,
                            value:"{path :'LocalModel>Time_Tuesday', type: 'sap.ui.model.odata.type.Time'}"   
                        }),
                        new TimePicker({
                            id:"tpWed",
                            valueState: "{LocalModel>ValueStateWednesday}",
                            valueFormat:"HH:mm:ss",
                            displayFormat:"HH:mm:ss",
                            change:this.handleChange,
                            support2400:true,
                            value:"{path :'LocalModel>Time_Wednesday', type: 'sap.ui.model.odata.type.Time'}"   
                        }),
                        new TimePicker({
                            id:"tpThurs",
                            valueState: "{LocalModel>ValueStateThursday}",
                            valueFormat:"HH:mm:ss",
                            displayFormat:"HH:mm:ss",
                            change:this.handleChange,
                            support2400:true,
                            value:"{path :'LocalModel>Time_Thursday', type: 'sap.ui.model.odata.type.Time'}"   
                        }),
                        new TimePicker({
                            id:"tpFri",
                            valueState: "{LocalModel>ValueStateFriday}",
                            valueFormat:"HH:mm:ss",
                            displayFormat:"HH:mm:ss",
                            change:this.handleChange,
                            support2400:true,
                            value:"{path :'LocalModel>Time_Friday', type: 'sap.ui.model.odata.type.Time'}"   
                        }),
                        new TimePicker({
                            id:"tpSat",
                            valueState: "{LocalModel>ValueStateSaturday}",
                            valueFormat:"HH:mm:ss",
                            displayFormat:"HH:mm:ss",
                            change:this.handleChange,
                            support2400:true,
                            value:"{path :'LocalModel>Time_Saturday', type: 'sap.ui.model.odata.type.Time'}"   
                        }),
                        new TimePicker({
                            id:"tpSun",
                            valueState: "{LocalModel>ValueStateSunday}",
                            valueFormat:"HH:mm:ss",
                            displayFormat:"HH:mm:ss",
                            change:this.handleChange,
                            support2400:true,
                            value:"{path :'LocalModel>Time_Sunday', type: 'sap.ui.model.odata.type.Time'}"   
                        }),
                    ]
                });
            },

            rebindTable: function (oTemplate, sKeyboardMode) {
                this.getView().byId("tbCharge").bindItems({
                    path: "LocalModel>/Batches",
                    sorter: new sap.ui.model.Sorter("BatchID") ,
                    template: oTemplate,
                    templateShareable: true
                }).setKeyboardMode(sKeyboardMode);
            },

            handleEdit: function (oEvent) {
                this.aProductCollection = deepExtend([], this.getView().getModel("LocalModel").getProperty("/Batches"));
                this.changeButtonVisibility("Edit");
                this.updateTableTitle();
                this.rebindTable(this.oEditableTemplate, "Edit");
            },

            handleCancel: function () {
                this.changeButtonVisibility("Cancel");
                this.getView().getModel("LocalModel").setProperty("/Batches", this.aProductCollection);
                this.updateTableTitle();
                this.rebindTable(this.oReadOnlyTemplate, "Navigation");
            },

            handleChange: function (oEvent) {
               
                var oLocalModel = this.getModel("LocalModel");
                var i18nModel = this.getModel("i18n").getResourceBundle();
                var centralBatch = oLocalModel.getProperty("/BatchesCentralStore");
                var changedCharge;

                var inpSource = oEvent.getSource();
                var tpId = oEvent.getParameter("id");
                var value = oEvent.getParameter("value");

                var sPath = inpSource.getParent().getBindingContext("LocalModel").sPath;
                var oContext = inpSource.getBindingContext("LocalModel");
                var strBatchID = oContext.getProperty("BatchID");

                oLocalModel.setProperty(sPath + "/UpdatedBatch", true);

                var filCentralBatch = centralBatch.filter(function(object, i) {
                    return object.BatchID === strBatchID;
                });
                
                if(tpId.includes("Mon")){
                    if(filCentralBatch.length >0){
                        changedCharge = filCentralBatch[0].Time_Monday.ms !== oContext.getProperty("Time_Monday").ms?true:false;
                        oLocalModel.setProperty(sPath + "/Changed_Monday", changedCharge);
                        oLocalModel.setProperty(sPath +"/ValueStateMonday", changedCharge === false ? "Success":"Warning");
                        oLocalModel.setProperty(sPath +"/ValueStateText" , i18nModel.getText("Table_Cell_TimePicker_ValueStateText"));
                    }else{
                        oLocalModel.setProperty(sPath + "/Changed_Monday",false);   
                        oLocalModel.setProperty(sPath +"/ValueStateMonday","Success"); 
                    }    
                }else if(tpId.includes("Tues")){
                    if(filCentralBatch.length >0){
                        changedCharge = filCentralBatch[0].Time_Tuesday.ms !== oContext.getProperty("Time_Tuesday").ms?true:false;
                        oLocalModel.setProperty(sPath + "/Changed_Tuesday", changedCharge);
                        oLocalModel.setProperty(sPath +"/ValueStateTuesday", changedCharge === false ? "Success":"Warning");
                        oLocalModel.setProperty(sPath +"/ValueStateText" , i18nModel.getText("Table_Cell_TimePicker_ValueStateText"));
                    }else{
                        oLocalModel.setProperty(sPath + "/Changed_Tuesday",false);       
                        oLocalModel.setProperty(sPath +"/ValueStateTuesday","Success");
                    }     
                }else if(tpId.includes("Wed")){
                    if(filCentralBatch.length >0){
                        changedCharge = filCentralBatch[0].Time_Wednesday.ms!== oContext.getProperty("Time_Wednesday").ms?true:false;
                        oLocalModel.setProperty(sPath + "/Changed_Wednesday", changedCharge);
                        oLocalModel.setProperty(sPath +"/ValueStateWednesday", changedCharge === false ? "Success":"Warning");
                        oLocalModel.setProperty(sPath +"/ValueStateText" , i18nModel.getText("Table_Cell_TimePicker_ValueStateText"));
                    }else{
                        oLocalModel.setProperty(sPath + "/Changed_Wednesday",false);     
                        oLocalModel.setProperty(sPath +"/ValueStateWednesday","Success"); 
                    }      
                } else if(tpId.includes("Thurs")){
                    if(filCentralBatch.length >0){
                        changedCharge = filCentralBatch[0].Time_Thursday.ms!== oContext.getProperty("Time_Thursday").ms?true:false;
                        oLocalModel.setProperty(sPath + "/Changed_Thursday", changedCharge);
                        oLocalModel.setProperty(sPath +"/ValueStateThursday", changedCharge === false ? "Success":"Warning");
                        oLocalModel.setProperty(sPath +"/ValueStateText" , i18nModel.getText("Table_Cell_TimePicker_ValueStateText"));
                    }else{
                        oLocalModel.setProperty(sPath + "/Changed_Thursday",false);     
                        oLocalModel.setProperty(sPath +"/ValueStateThursday","Success");  
                    }    
                } else if(tpId.includes("Fri")){
                    if(filCentralBatch.length >0){
                        changedCharge = filCentralBatch[0].Time_Friday.ms!== oContext.getProperty("Time_Friday").ms?true:false;
                        oLocalModel.setProperty(sPath + "/Changed_Friday", changedCharge);
                        oLocalModel.setProperty(sPath +"/ValueStateFriday", changedCharge === false ? "Success":"Warning");
                        oLocalModel.setProperty(sPath +"/ValueStateText" , i18nModel.getText("Table_Cell_TimePicker_ValueStateText"));
                    }else{
                        oLocalModel.setProperty(sPath + "/Changed_Friday",false);  
                        oLocalModel.setProperty(sPath +"/ValueStateFriday","Success");   
                    }    
                } else if(tpId.includes("Sat")){
                    if(filCentralBatch.length >0){
                        changedCharge = filCentralBatch[0].Time_Saturday.ms!== oContext.getProperty("Time_Saturday").ms?true:false;
                        oLocalModel.setProperty(sPath + "/Changed_Saturday", changedCharge);
                        oLocalModel.setProperty(sPath +"/ValueStateSaturday", changedCharge === false ? "Success":"Warning");
                        oLocalModel.setProperty(sPath +"/ValueStateText" , i18nModel.getText("Table_Cell_TimePicker_ValueStateText"));
                    }else{
                        oLocalModel.setProperty(sPath + "/Changed_Saturday", false);   
                        oLocalModel.setProperty(sPath +"/ValueStateSaturday","Success"); 
                    }    
                } else if(tpId.includes("Sun")){
                    if(filCentralBatch.length >0){
                        changedCharge = filCentralBatch[0].Time_Sunday.ms !== oContext.getProperty("Time_Sunday").ms?true:false;
                        oLocalModel.setProperty(sPath + "/Changed_Sunday", changedCharge);
                        oLocalModel.setProperty(sPath +"/ValueStateSunday", changedCharge === false ? "Success":"Warning");
                        oLocalModel.setProperty(sPath +"/ValueStateText" , i18nModel.getText("Table_Cell_TimePicker_ValueStateText"));
                    }else{
                        oLocalModel.setProperty(sPath + "/Changed_Sunday", false);  
                        oLocalModel.setProperty(sPath +"/ValueStateSunday","Success"); 
                    }         
                }    
            },

            
            handleChargeUpdate: function (oEvent) {

                this.chargeUpdateDeferred = $.Deferred();

                var oModel = this.getOwnerComponent().getModel();//this.getView().getModel();
                var oLocalModel = this.getView().getModel("LocalModel");
                var i18nModel = this.getOwnerComponent().getModel("i18n").getResourceBundle();

                var strStore = this.getView().byId("cbStore").getSelectedKey();
                var strDepartmentID = this.getView().byId("cbDepartment").getSelectedKey();

                var strDepdesc ="";
                var nRecords = 0;
                var nRecordsCreated = 0;
                var nRecUpdated = 0;
                var nRecCreated = 0;
                
                var chargeData = oLocalModel.getProperty("/Batches");
                //separate the list for update and create.
                var chargeDataUpdated=chargeData.filter(function(data){
                    return data.ID !== "";
                });

                var chargeDataCreated=chargeData.filter(function(data){
                    return data.ID === "";
                });

                /// segregate update and new creation
                if (this.validateCharge()) {
                    MessageBox.confirm(i18nModel.getText("Message_Confirm_Update"), {
                        title: i18nModel.getText("Confirm"),
                        onClose: $.proxy(function (oAction) {
                            if (oAction === MessageBox.Action.OK) {

                                for (var i = 0; i < chargeDataUpdated.length; i++) {
                                    strDepdesc = chargeDataUpdated[i].Department.DepartmentDescription;
                                    if (chargeDataUpdated[i].ID !=="" && chargeDataUpdated[i].UpdatedBatch === true) {
                                        nRecords=nRecords+1;
                                        var payload = this.requestPayload(chargeDataUpdated[i]);
                                        oModel.update("/Batches(guid'"+chargeDataUpdated[i].ID+"')",payload,{
                                        success: $.proxy(function(oData) { 
                                            nRecUpdated=nRecUpdated+1;
                                            if (nRecords === nRecUpdated) {
                                                this.chargeUpdateDeferred.resolve();
                                            }
                                        }, this),
                                        error: $.proxy(function(error) {
                                            MessageToast.show(error); 
                                            this.chargeUpdateDeferred.reject();   
                                        }, this)});
                                    }else{
                                        this.chargeUpdateDeferred.resolve();
                                    }
                                }

                                //create charges
                                $.when(this.chargeUpdateDeferred).done($.proxy(function() {
                                    if(chargeDataCreated.length >0){
                                        for (var i = 0; i < chargeDataCreated.length; i++) {
                                            nRecordsCreated=nRecordsCreated+1;
                                            var payload = this.requestPayload(chargeDataCreated[i]);
                                            oModel.create("/Batches", payload, {
                                            success: $.proxy(function(oData) { 
                                                nRecCreated=nRecCreated+1;
                                                if (nRecordsCreated === nRecCreated) {
                                                    this.changeButtonVisibility("Create");
                                                    this.loadStoreSpecificBatches(strStore, strDepartmentID);
                                                }
                                            }, this),
                                            error: $.proxy(function(error) {
                                                MessageToast.show(error); 
                                            }, this)});
                                        } 
                                    }else{
                                        this.changeButtonVisibility("Create");
                                    }   
                                }, this));

                            }
                        },this)   
                    }); // messagebox
                }   // end of if
            },

            handleChargeDelete:function(oEvent){

                var oView = this.getView();
                var oModel = this.getOwnerComponent().getModel(); //this.getView().getModel();
                var i18nModel = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                var oLocalModel = oView.getModel("LocalModel");    

                var oParameter = oEvent.getParameter("listItem");
                var selectedBatch = oParameter.getBindingContext("LocalModel").getObject();
                var path = oParameter.getBindingContext("LocalModel").getPath();
                var indexToDelete = path.substring(path.lastIndexOf("/") + 1);
                var chargeData = oLocalModel.getProperty("/Batches");
                var tblCharge =oView.byId("tbCharge");

                var valDept = oView.byId("cbDepartment").getValue();

                MessageBox.confirm(i18nModel.getText("Message_Confirm_Delete"), {
				title: i18nModel.getText("Confirm"),
				    onClose: $.proxy(function(oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            if(selectedBatch.ID !== ""){
                                oModel.remove("/Batches(guid'"+selectedBatch.ID+"')", {
                                    success: $.proxy(function(oData) { 
                                        chargeData.splice(indexToDelete, 1);
                                        oLocalModel.setProperty("/Batches", chargeData);
                                        this.changeButtonVisibility("Delete");
                                        if(tblCharge.getKeyboardMode() === "Navigation"){
                                            oView.byId("editButton").setVisible(true);
                                            if(chargeData.length === 0){
                                                oView.byId("copyCentralButton").setVisible(true);
                                                oView.byId("editButton").setVisible(false);
                                            }
                                        }else if(tblCharge.getKeyboardMode() === "Edit"){  
                                            oView.byId("saveButton").setVisible(true);
                                            oView.byId("cancelButton").setVisible(true);
                                            if(chargeData.length === 0){
                                                oView.byId("copyCentralButton").setVisible(true);
                                                oView.byId("saveButton").setVisible(false);
                                                oView.byId("cancelButton").setVisible(false);
                                            }
                                        }
                                        
                                        MessageToast.show(i18nModel.getText("Message_Delete_Per_Charge",[selectedBatch.BatchID, valDept]));
                                        
                                    }, this),
                                    error: $.proxy(function(oError) {
                                        MessageToast.show(oError);
                                    }, this)
                                });
                            }else{
                                chargeData.splice(indexToDelete, 1);
                                oLocalModel.setProperty("/Batches", chargeData);
                                this.changeButtonVisibility("Delete");
                                oView.byId("createChargeButton").setVisible(true);
                                oView.byId("cancelButton").setVisible(true);
                                if(chargeData.length === 0){
                                    oView.byId("createChargeButton").setVisible(false);
                                    oView.byId("copyCentralButton").setVisible(true);
                                    oView.byId("cancelButton").setVisible(false);
                                    oView.byId("editButton").setVisible(false);
                                    oView.byId("saveButton").setVisible(false);
                                }    
                                MessageToast.show(i18nModel.getText("Message_Delete_Per_Charge",[selectedBatch.BatchID, valDept]));
                            }
                        }
                    },this)   
                });    
            },

            handleChargeCreate:function(oEvent){

                var oView = this.getView();
                var oModel = this.getOwnerComponent().getModel(); //this.getView().getModel();
                var i18nModel = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                var oLocalModel = oView.getModel("LocalModel");
                var strStore = oView.byId("cbStore").getSelectedKey();
                var strDepartment = oView.byId("cbDepartment").getSelectedKey();

                var chargeData = oLocalModel.getProperty("/Batches");
                var nRecords=0;
                var nRecCreated=0;
                this.updateTableTitle();

                if (this.validateCharge()) {
                    MessageBox.confirm(i18nModel.getText("Message_Confirm_Create",[strStore]),{
                        title: i18nModel.getText("Confirm"),
                        onClose: $.proxy(function (oAction) {
                            if (oAction === MessageBox.Action.OK) {

                                //oModel.setDeferredGroups(["CreateBatch"]);
                                for (var i = 0; i < chargeData.length; i++) {
                                    nRecords++;
                                    var payload = this.requestPayload(chargeData[i]);
                                    oModel.create("/Batches", payload, {
                                        success: $.proxy(function(oData) {
                                            nRecCreated++;
                                            if (nRecords === nRecCreated) {
                                                this.changeButtonVisibility("Create");
                                                this.loadStoreSpecificBatches(strStore, strDepartment);
                                            }
                                        }, this),
                                        error: $.proxy(function(oError) {
                                                MessageToast.show(oError);
                                        }, this)
                                    });
                                }
                            }
                        },this)   
                    });
                } // end of if    
            },

            handleAddNewCharge:function(oEvent){

                var oView = this.getView();
                var oLocalModel =oView.getModel("LocalModel");
                var strStore = oView.byId("cbStore").getSelectedKey();
                var strDept = oView.byId("cbDepartment").getSelectedKey();

                var aCollection = oLocalModel.getProperty("/Batches");
                //find if new entry created for fresh create or after Edit.
                //separate the list for update and create.
                var chargeDataUpdated=aCollection.filter(function(data){
                    return data.ID !== "";
                });
                var nRecords = aCollection.length;
                ++nRecords;
                var newEntry =  {
                    "ID": "",
                    "BatchID": nRecords,
                    "Changed_Monday": false,
                    "Time_Monday": null,
                    "Changed_Tuesday": false,
                    "Time_Tuesday": null,
                    "Changed_Wednesday": false,
                    "Time_Wednesday": null,
                    "Changed_Thursday": false,
                    "Time_Thursday": null,
                    "Changed_Friday": false,
                    "Time_Friday": null,
                    "Changed_Saturday": false,
                    "Time_Saturday": null,
                    "Changed_Sunday": false,
                    "Time_Sunday": null,
                    "Store_StoreID":strStore,
                    "Department_DepartmentID":strDept
                };
                
                if(chargeDataUpdated.length >0){
                    oView.byId("saveButton").setVisible(true);
                    oView.byId("createChargeButton").setVisible(false);
                }else{
                    oView.byId("saveButton").setVisible(false);
                    oView.byId("createChargeButton").setVisible(true);
                    if(aCollection.length === 0)
                        this.rebindTable(this.oEditableTemplate, "Edit");
                }
                
                oView.byId("cancelButton").setVisible(true);
                //
                aCollection.push(newEntry);
                oLocalModel.setProperty("/Batches", aCollection);
            },

            handleCopyFromCentral:function(){

                var oView = this.getView();
                var oLocalModel = oView.getModel("LocalModel");
                var strStore = oView.byId("cbStore").getSelectedKey();

                this.loadCentralStoreCharge();

                $.when(this.loadCentralStoreDeferred).done($.proxy(function() {
                    var data =oLocalModel.getProperty("/BatchesCentralStore");
                    if(data.length >0){
                        var tempArr = this.adjustBatchDataStructure(data);
                        oLocalModel.setProperty("/Batches", tempArr);
                        this.changeButtonVisibility("Copy");
                    }    
                }, this));     
            },

            adjustBatchDataStructure:function(data){

                var strStore =  this.getView().byId("cbStore").getSelectedKey();
                var tempArr =[];
                data.forEach((v, i) => {
                    var object = JSON.parse(JSON.stringify(v));  // this has to be done to remove the object reference in Arr.
                    delete object.Store;
                    delete object.Department;
                    object.ID="";
                    object.Store_StoreID=strStore;
                    object.UpdatedBatch = false;
                    object.ValueStateMonday = "Success";
                    object.ValueStateTuesday = "Success";
                    object.ValueStateWednesday = "Success";
                    object.ValueStateThursday = "Success";
                    object.ValueStateFriday = "Success";
                    object.ValueStateSaturday = "Success";
                    object.ValueStateSunday = "Success";
                    tempArr.push(object);
                },this);

                return tempArr;

            },

            requestPayload:function(chargeData){
                var payload = {
                    "Store_StoreID": chargeData.Store_StoreID,
                    "Department_DepartmentID": chargeData.Department_DepartmentID,
                    "BatchID": chargeData.BatchID,
                    "Changed_Monday": chargeData.Changed_Monday,
                    "Changed_Tuesday": chargeData.Changed_Tuesday,
                    "Changed_Wednesday": chargeData.Changed_Wednesday,
                    "Changed_Thursday": chargeData.Changed_Thursday,
                    "Changed_Friday": chargeData.Changed_Friday,
                    "Changed_Saturday": chargeData.Changed_Saturday,
                    "Changed_Sunday": chargeData.Changed_Sunday,
                    "Time_Monday": chargeData.Time_Monday,
                    "Time_Tuesday": chargeData.Time_Tuesday,
                    "Time_Wednesday": chargeData.Time_Wednesday,
                    "Time_Thursday": chargeData.Time_Thursday,
                    "Time_Friday": chargeData.Time_Friday,
                    "Time_Saturday": chargeData.Time_Saturday,
                    "Time_Sunday": chargeData.Time_Sunday,
                }

                return payload;
            },

            clearValues:function(){
                var oView = this.getView();
                oView.byId("cbStore").setValue(" ");
                oView.byId("cbDepartment").setValue(" ");
                oView.getModel("LocalModel").setProperty("/Batches",[]);
                oView.getModel("LocalModel").setProperty("/Stores",[]);
                oView.getModel("LocalModel").setProperty("/Departments",[]);
                 oView.getModel("LocalModel").setProperty("/BatchesCentralStore",[]);
            },

            changeButtonVisibility:function(mode){

                    var oView = this.getView();

                    if(mode === "Create"){
                        oView.byId("createChargeButton").setVisible(false);
                        oView.byId("cancelButton").setVisible(false);
                        oView.byId("linkAddCharge").setVisible(false);
                        oView.byId("saveButton").setVisible(false);
                        oView.byId("editButton").setVisible(true);
                        this.rebindTable(this.oReadOnlyTemplate, "Navigation");
                    }else if(mode === "Delete"){
                        oView.byId("createChargeButton").setVisible(false);
                        oView.byId("cancelButton").setVisible(false);
                        oView.byId("saveButton").setVisible(false);
                        oView.byId("editButton").setVisible(false);
                        oView.byId("copyCentralButton").setVisible(false);
                        oView.byId("linkAddCharge").setVisible(true);
                    }else if(mode === "Copy"){
                        oView.byId("copyCentralButton").setVisible(false);
                        oView.byId("createChargeButton").setVisible(true);
                        oView.byId("cancelButton").setVisible(true);
                        oView.byId("editButton").setVisible(false);
                        oView.byId("saveButton").setVisible(false);
                        this.rebindTable(this.oEditableTemplate, "Edit");   
                    }else if(mode === "Edit"){
                        oView.byId("editButton").setVisible(false);
                        oView.byId("saveButton").setVisible(true);
                        oView.byId("cancelButton").setVisible(true);
                        oView.byId("linkAddCharge").setVisible(true);
                    }else if(mode === "Cancel"){
                        oView.byId("cancelButton").setVisible(false);
                        oView.byId("saveButton").setVisible(false);
                        oView.byId("createChargeButton").setVisible(false);
                        oView.byId("editButton").setVisible(true);
                    }else if(mode === "storeChange"){
                        oView.byId("cancelButton").setVisible(false);
                        oView.byId("editButton").setVisible(false);
                        oView.byId("saveButton").setVisible(false);
                        oView.byId("linkAddCharge").setVisible(false);
                        oView.byId("copyCentralButton").setVisible(false);
                        oView.byId("createChargeButton").setVisible(false);
                    }else if(mode === "search"){
                        oView.byId("editButton").setVisible(false);
                        oView.byId("cancelButton").setVisible(false);
                        oView.byId("linkAddCharge").setVisible(true);
                        oView.byId("createChargeButton").setVisible(false);
                        oView.byId("copyCentralButton").setVisible(false);
                    }
            },
        

            validateCharge:function(){
                var oLocalModel = this.getView().getModel("LocalModel");
                var i18nModel = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                var batchesData = oLocalModel.getProperty("/Batches");
                var messageText="";
                var error=false;

                for (var i = 0; i < batchesData.length-1; i++) {
                    var next = i+1;
                    if (batchesData[next].Time_Monday.ms !== null) {
                        if ((batchesData[next].Time_Monday.ms <= batchesData[i].Time_Monday.ms)) {
                            error = true;
                            messageText = i18nModel.getText("Validate_Charge_Monday",[batchesData[next].BatchID]);
                            oLocalModel.setProperty("/Batches/"+next+"/ValueStateMonday", "Error");
                            break;
                        }else{
                            var changed = oLocalModel.getProperty("/Batches/"+next+"/Changed_Monday");
                            oLocalModel.setProperty("/Batches/"+next+"/ValueStateMonday", changed === false ?"Success":"Warning");
                        }
                    }
                    
                    if (batchesData[next].Time_Tuesday !== null) {
                        if ((batchesData[next].Time_Tuesday.ms <= batchesData[i].Time_Tuesday.ms)) {
                            error = true;
                            messageText = i18nModel.getText("Validate_Charge_Tuesday",[batchesData[next].BatchID]);
                            oLocalModel.setProperty("/Batches/"+next+"/ValueStateTuesday", "Error");
                            break;
                        } else{
                            var changed = oLocalModel.getProperty("/Batches/"+next+"/Changed_Tuesday");
                            oLocalModel.setProperty("/Batches/"+next+"/ValueStateTuesday", changed === false ?"Success":"Warning");
                        }
                    }
                    if (batchesData[next].Time_Wednesday !== null) {
                        if ((batchesData[next].Time_Wednesday.ms <= batchesData[i].Time_Wednesday.ms)) {
                            error = true;
                            messageText = i18nModel.getText("Validate_Charge_Wednesday",[batchesData[next].BatchID]);
                            oLocalModel.setProperty("/Batches/"+next+"/ValueStateWednesday", "Error");
                            break;
                        } else{
                            var changed = oLocalModel.getProperty("/Batches/"+next+"/Changed_Wednesday");
                            oLocalModel.setProperty("/Batches/"+next+"/ValueStateWednesday", changed === false ?"Success":"Warning");
                        }
                    }
                    if (batchesData[next].Time_Thursday !== null) {
                        if ((batchesData[next].Time_Thursday.ms <= batchesData[i].Time_Thursday.ms)) {
                            error = true;
                            messageText = i18nModel.getText("Validate_Charge_Thursday",[batchesData[next].BatchID]);
                            oLocalModel.setProperty("/Batches/"+next+"/ValueStateThursday", "Error");
                            break;
                        } else{
                            var changed = oLocalModel.getProperty("/Batches/"+next+"/Changed_Thursday");
                            oLocalModel.setProperty("/Batches/"+next+"/ValueStateThursday", changed === false ?"Success":"Warning");
                        }
                    }
                    if (batchesData[next].Time_Friday !== null) {
                        if ((batchesData[next].Time_Friday.ms <= batchesData[i].Time_Friday.ms)) {
                            error = true;
                            messageText = i18nModel.getText("Validate_Charge_Friday",[batchesData[next].BatchID]);
                            oLocalModel.setProperty("/Batches/"+next+"/ValueStateFriday", "Error");
                            break;
                        } else{
                            var changed = oLocalModel.getProperty("/Batches/"+next+"/Changed_Friday");
                            oLocalModel.setProperty("/Batches/"+next+"/ValueStateFriday", changed === false ?"Success":"Warning");
                        }
                    }
                    if (batchesData[next].Time_Saturday !== null) {
                        if ((batchesData[next].Time_Saturday.ms <= batchesData[i].Time_Saturday.ms)) {
                            error = true;
                            messageText = i18nModel.getText("Validate_Charge_Saturday",[batchesData[next].BatchID]);
                            oLocalModel.setProperty("/Batches/"+next+"/ValueStateSaturday", "Error");
                            break;
                        } else{
                            var changed = oLocalModel.getProperty("/Batches/"+next+"/Changed_Saturday");
                            oLocalModel.setProperty("/Batches/"+next+"/ValueStateSaturday", changed === false ?"Success":"Warning");
                        }
                    }

                    if (batchesData[next].Time_Sunday !== null) {
                        if ((batchesData[next].Time_Sunday.ms <= batchesData[i].Time_Sunday.ms)) {
                            error = true;
                            messageText = i18nModel.getText("Validate_Charge_Sunday",[batchesData[next].BatchID]);
                            oLocalModel.setProperty("/Batches/"+next+"/ValueStateSunday", "Error");
                            break;
                        } else{
                            var changed = oLocalModel.getProperty("/Batches/"+next+"/Changed_Sunday");
                            oLocalModel.setProperty("/Batches/"+next+"/ValueStateSunday", changed === false ?"Success":"Warning");
                        }
                    }
                    if (error) {
                        break;
                    }
                }    
                
                if (error) {
                    MessageToast.show(messageText);
                }
                
                return !error;
            }
        });
    });
