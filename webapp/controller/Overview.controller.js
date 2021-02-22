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

        return BaseController.extend("com.sap.fiorichargeapp.controller.Overview", {
            onInit: function () {
                this.oRouter = new sap.ui.core.UIComponent.getRouterFor(this);
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
                
                console.log("oNameParameter -->" + oNameParameter);
                if(oNameParameter === "Admin"){
                    this.loadStores("Admin");
                    this.loadDepartment();
                }else{
                    this.clearValues();
                    this.loadStores();
                    this.loadDepartment();
                }
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

            loadStores: function (strRole) {

                var oLocalModel = this.getView().getModel("LocalModel");
                var oModel = this.getOwnerComponent().getModel();//this.getView().getModel();
                var filter=[];
                
                filter.push(new Filter("StoreID", FilterOperator.NE, '9999'));

                var urlParameter = {};

                
                DataManager.read(oModel,"/Stores",filter,urlParameter,jQuery.proxy(function(oData) {
                    oLocalModel.setProperty("/Stores", oData.results);
                },this), jQuery.proxy(function(oError){

                },this));
             },

            loadDepartment: function () {
                var oLocalModel = this.getView().getModel("LocalModel");
                var oModel = this.getOwnerComponent().getModel();//this.getView().getModel();

                var urlParameter = {};
                DataManager.read(oModel,"/Departments","",urlParameter,jQuery.proxy(function(oData) {
                    oLocalModel.setProperty("/Departments", oData.results);
                },this), jQuery.proxy(function(oError){

                },this));
            },

            handleStoreChange: function (oEvent) {
                var oLocalModel = this.getView().getModel("LocalModel");
                var oModel = this.getOwnerComponent().getModel();
                var filter = [];
                var selectedStore = oEvent.oSource.getSelectedKey();
                var cbDepartment =this.getView().byId("cbDepartment");
               
                if (selectedStore.length > 0) {
                    filter = [new sap.ui.model.Filter("StoreID", sap.ui.model.FilterOperator.EQ, selectedStore)];
                }

                var urlParameter = {};

                DataManager.read(oModel,"/StoresToDepartments",filter,urlParameter,jQuery.proxy(function(oData) {
                    var filterDep=[];
                    for (var i = 0; i < oData.results.length; i++) {
                        filterDep.push(new Filter("DepartmentID" , FilterOperator.EQ, oData.results[i].DepartmentID));
                    }
                    cbDepartment.getBinding("items").filter(filterDep);
                    cbDepartment.setSelectedItemId("");
                },this), jQuery.proxy(function(oError){

                },this));
            },

            handleOnSearch: function (oEvent) {

                var oLocalModel = this.getView().getModel("LocalModel");
                var oModel = this.getOwnerComponent().getModel();
                
                var cbStore = this.getView().byId("cbStore");
                var cbDepartment = this.getView().byId("cbDepartment");

                var strStore = cbStore.getSelectedKey();
                var valStore = cbStore.getValue();
                var strDepartmentID = cbDepartment.getSelectedKey();
                var valDepartDesc = cbDepartment.getValue();

                oLocalModel.setProperty("/Batches",[]);

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

                this.loadCentralStoreCharge();
                DataManager.read(oModel,"/Batches",filter,urlParameter,jQuery.proxy(function(oData) {
                    if(oData.results.length >0){
                        $.when(this.loadCentralStoreDeferred).done($.proxy(function() {
                            for (var i = 0; i < oData.results.length; i++) {
                                oData.results[i].UpdatedBatch = false;
                            }
                            oLocalModel.setProperty("/Batches", oData.results);
                            this.updateTableTitle(); 
                            this.byId("editButton").setVisible(true);
                            this.byId("createChargeButton").setVisible(false);
                        }, this));    
                    }else{
                        $.when(this.loadCentralStoreDeferred).done($.proxy(function() {
                            var data =oLocalModel.getProperty("/BatchesCentralStore");
                            if(data.length >0){
                                var tempArr =[];
                                data.forEach((v, i) => {
                                    var object = JSON.parse(JSON.stringify(v));  // this has to be done to remove the object reference in Arr.
                                    delete object.Store;
                                    delete object.Department;
                                    object.ID="";
                                    object.Store_StoreID=strStore;
                                    object.UpdatedBatch = false;
                                    tempArr.push(object);
                                },this);
                            
                                oLocalModel.setProperty("/Batches", tempArr);
                                this.rebindTable(this.oEditableTemplate, "Edit");   
                                this.byId("editButton").setVisible(false);
                                this.byId("cancelButton").setVisible(false);
                                this.byId("createChargeButton").setVisible(true);
                                this.byId("linkAddCharge").setVisible(true);
                            }else{
                                this.byId("editButton").setVisible(false);
                                this.byId("cancelButton").setVisible(false);
                                this.byId("createChargeButton").setVisible(false);
                                this.byId("linkAddCharge").setVisible(true);
                            }    

                            this.updateTableTitle(); 
                        }, this));
                    }       
                    
                },this), jQuery.proxy(function(oError){

                },this));
            },

            loadCentralStoreCharge:function(){

                this.loadCentralStoreDeferred = $.Deferred();
                var oLocalModel = this.getView().getModel("LocalModel");
                var oModel = this.getOwnerComponent().getModel();//this.getView().getModel();

                var strDepartmentID = this.getView().byId("cbDepartment").getSelectedKey();
                
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
                    this.getView().byId("tbCentralCharge").setVisible(true);
                    this.loadCentralStoreDeferred.resolve();
                },this), jQuery.proxy(function(oError){
                   this.loadCentralStoreDeferred.reject();     
                },this));
            },

            updateTableTitle:function(){
                var oView = this.getView();
                var oLocalModel = this.getView().getModel("LocalModel");
                
                var strStore = oView.byId("cbStore").getSelectedKey();
                var strDepartmentDesc = oView.byId("cbDepartment").getValue();
                oView.byId("tbHeaderTitle").setText("Store : " + strStore + " - " + strDepartmentDesc);

                var centralStore =oLocalModel.getProperty("/BatchesCentralStore")
                if(centralStore.length>0){
                    var objCentralStore =oLocalModel.getProperty("/BatchesCentralStore")[0];
                    var strCentralStore= objCentralStore.Store.StoreName;
                    oView.byId("tbHeaderTitleCentral").setText("Store : " + strCentralStore + " - " + strDepartmentDesc+"("+centralStore.length+")");
                }else{
                    oView.byId("tbHeaderTitleCentral").setText("Store : Central Store - " + strDepartmentDesc+"(0)");
                }
            },

            initializeEditableTemplate: function () {
                this.oEditableTemplate = new ColumnListItem({
                    cells: [
                        new ObjectStatus({
                            text: "{LocalModel>BatchID}"
                        }),
                        new TimePicker({
                            id:"tpMon",
                            valueState: "{=${LocalModel>Changed_Monday} === false?'Success':'Warning'}",
                            valueFormat:"HH:mm:ss",
                            displayFormat:"HH:mm:ss",
                            change:this.handleChange,
                            support2400:true,
                            value:"{path :'LocalModel>Time_Monday', type: 'sap.ui.model.odata.type.Time'}"   
                        }),
                        new TimePicker({
                            id:"tpTues",
                            valueState: "{=${LocalModel>Changed_Tuesday} === false?'Success':'Warning'}",
                            valueFormat:"HH:mm:ss",
                            displayFormat:"HH:mm:ss",
                            change:this.handleChange,
                            support2400:true,
                            value:"{path :'LocalModel>Time_Tuesday', type: 'sap.ui.model.odata.type.Time'}"   
                        }),
                        new TimePicker({
                            id:"tpWed",
                            valueState: "{=${LocalModel>Changed_Wednesday} === false?'Success':'Warning'}",
                            valueFormat:"HH:mm:ss",
                            displayFormat:"HH:mm:ss",
                            change:this.handleChange,
                            support2400:true,
                            value:"{path :'LocalModel>Time_Wednesday', type: 'sap.ui.model.odata.type.Time'}"   
                        }),
                        new TimePicker({
                            id:"tpThurs",
                            valueState: "{=${LocalModel>Changed_Thursday} === false?'Success':'Warning'}",
                            valueFormat:"HH:mm:ss",
                            displayFormat:"HH:mm:ss",
                            change:this.handleChange,
                            support2400:true,
                            value:"{path :'LocalModel>Time_Thursday', type: 'sap.ui.model.odata.type.Time'}"   
                        }),
                        new TimePicker({
                            id:"tpFri",
                            valueState: "{=${LocalModel>Changed_Friday} === false?'Success':'Warning'}",
                            valueFormat:"HH:mm:ss",
                            displayFormat:"HH:mm:ss",
                            change:this.handleChange,
                            support2400:true,
                            value:"{path :'LocalModel>Time_Friday', type: 'sap.ui.model.odata.type.Time'}"   
                        }),
                        new TimePicker({
                            id:"tpSat",
                            valueState: "{=${LocalModel>Changed_Saturday} === false?'Success':'Warning'}",
                            valueFormat:"HH:mm:ss",
                            displayFormat:"HH:mm:ss",
                            change:this.handleChange,
                            support2400:true,
                            value:"{path :'LocalModel>Time_Saturday', type: 'sap.ui.model.odata.type.Time'}"   
                        }),
                        new TimePicker({
                            id:"tpSun",
                            valueState: "{=${LocalModel>Changed_Sunday} === false?'Success':'Warning'}",
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
                var i = oEvent.getSource();
                var tpId = oEvent.getParameter("id");
                var value = oEvent.getParameter("value");

                var sPath = i.getParent().getBindingContext("LocalModel").sPath;
                oLocalModel.setProperty(sPath + "/UpdatedBatch", true);

                if(oEvent.getSource()._sOldInputValue !== value){
                    if(tpId.includes("Mon")){
                        oLocalModel.setProperty(sPath + "/Changed_Monday", true);
                    }else if(tpId.includes("Tues")){
                        oLocalModel.setProperty(sPath + "/Changed_Tuesday", true);
                    }else if(tpId.includes("Wed")){
                        oLocalModel.setProperty(sPath + "/Changed_Wednesday", true);
                    }else if(tpId.includes("Thurs")){
                        oLocalModel.setProperty(sPath + "/Changed_Thursday", true);
                    }else if(tpId.includes("Fri")){
                        oLocalModel.setProperty(sPath + "/Changed_Friday", true);
                    }else if(tpId.includes("Sat")){
                        oLocalModel.setProperty(sPath + "/Changed_Saturday", true);
                    }else if(tpId.includes("Sunday")){
                        oLocalModel.setProperty(sPath + "/Changed_Sunday", true);
                    }
                }
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
                    oView.byId("linkAddCharge").setVisible(true);
                }else if(mode === "Copy"){
                    oView.byId("copyCentralButton").setVisible(false);
                    oView.byId("createChargeButton").setVisible(true);
                    oView.byId("cancelButton").setVisible(true);
                    this.rebindTable(this.oEditableTemplate, "Edit");   
                }else if(mode === "Edit"){
                    oView.byId("editButton").setVisible(false);
                    oView.byId("saveButton").setVisible(true);
                    oView.byId("cancelButton").setVisible(true);
                    oView.byId("linkAddCharge").setVisible(true);
                }else if(mode === "Cancel"){
                    oView.byId("cancelButton").setVisible(false);
                    oView.byId("saveButton").setVisible(false);
                    oView.byId("editButton").setVisible(true);
                }
            },

            handleChargeUpdate: function (oEvent) {

                this.chargeUpdateDeferred = $.Deferred();

                var oModel = this.getOwnerComponent().getModel();//this.getView().getModel();
                var oLocalModel = this.getView().getModel("LocalModel");
                var i18nModel = this.getOwnerComponent().getModel("i18n");

                var strStore = this.getView().byId("cbStore").getSelectedKey();
                var valDept = this.getView().byId("cbDepartment").getValue();

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
                MessageBox.confirm(i18nModel.getText("Message_Confirm_Update"), {
                    title: "Confirm",
                    onClose: $.proxy(function (oAction) {
                        if (oAction === MessageBox.Action.OK) {

                            for (var i = 0; i < chargeDataUpdated.length; i++) {
                                strDepdesc = chargeDataUpdated[i].Department.DepartmentDescription;
                                if (chargeDataUpdated[i].ID !=="" && chargeDataUpdated[i].UpdatedBatch === true) {
                                    nRecords=nRecords+1;
                                    var payload = this.requestPayload(chargeDataUpdated[i]);
                                    DataManager.update(oModel,"/Batches(guid'"+chargeDataUpdated[i].ID+"')",payload,
                                    jQuery.proxy(function(oData){ 
                                        nRecUpdated=nRecUpdated+1;
                                        if (nRecords === nRecUpdated) {
                                            this.chargeUpdateDeferred.resolve();
                                        }
                                    }, this),
                                    jQuery.proxy(function(oError){
                                        MessageToast.show(error); 
                                        this.chargeUpdateDeferred.reject();   
                                    }, this));
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
                                        DataManager.create("/Batches", payload, 
                                        jQuery.proxy(function(oData){ 
                                            nRecCreated=nRecCreated+1;
                                            if (nRecordsCreated === nRecCreated) {
                                                    this.changeButtonVisibility("Create");
                                            }
                                        }, this),
                                        jQuery.proxy(function(oData){ 
                                            MessageToast.show(error); 
                                        }, this));
                                    } 
                                }else{
                                    this.changeButtonVisibility("Create");
                                }   
                            }, this));

                        }
                    },this)   
                });
            },

            handleChargeDelete:function(oEvent){

                var oModel = this.getOwnerComponent().getModel(); //this.getView().getModel();
                var oLocalModel = this.getView().getModel("LocalModel");    
                var oParameter = oEvent.getParameter("listItem");
                var selectedBatch = oParameter.getBindingContext("LocalModel").getObject();
                var path = oParameter.getBindingContext("LocalModel").getPath();
                var indexToDelete = path.substring(path.lastIndexOf("/") + 1);
                var chargeData = oLocalModel.getProperty("/Batches");

                var valDept = this.getView().byId("cbDepartment").getValue();

                MessageBox.confirm("Are you Sure you want to Delete the Batch ?", {
				title: "Confirm",
				    onClose: $.proxy(function(oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            if(selectedBatch.ID !== ""){
                                DataManager.remove("/Batches(guid'"+selectedBatch.ID+"')", 
                                    jQuery.proxy(function(oData){ 
                                        chargeData.splice(indexToDelete, 1);
                                        oLocalModel.setProperty("/Batches", chargeData);
                                        this.changeButtonVisibility("Delete");
                                        if(chargeData.length === 0)
                                            this.getView().byId("copyCentralButton").setVisible(true);
                                        MessageToast.show("Charge "+selectedBatch.BatchID+" for Department "+ valDept + " is deleted.");
                                    }, this),
                                    jQuery.proxy(function(oData){ 
                                        MessageToast.show(oError);
                                    }, this)
                                );
                            }else{
                                chargeData.splice(indexToDelete, 1);
                                oLocalModel.setProperty("/Batches", chargeData);
                                this.changeButtonVisibility("Delete");
                                if(chargeData.length === 0)
                                    this.getView().byId("copyCentralButton").setVisible(true);
                                
                                MessageToast.show("Charge "+selectedBatch.BatchID+" for Department "+ valDept + " is deleted.");
                            }
                        }
                    },this)   
                });    
            },

            handleChargeCreate:function(oEvent){

                var strStore = this.getView().byId("cbStore").getSelectedKey();
                var strBaf = this.getView().byId("cbDepartment").getSelectedKey();
                var oModel = this.getOwnerComponent().getModel(); //this.getView().getModel();
                var oLocalModel = this.getView().getModel("LocalModel");

                var chargeData = oLocalModel.getProperty("/Batches");
                var nRecords=0;
                var nRecCreated=0;
                this.updateTableTitle();
                MessageBox.confirm("Do you want to Create a Charge for Store "+strStore+" and Department "+strBaf+"?", {
                    title: "Confirm",
                    onClose: $.proxy(function (oAction) {
                        if (oAction === MessageBox.Action.OK) {

                            //oModel.setDeferredGroups(["CreateBatch"]);
                            for (var i = 0; i < chargeData.length; i++) {
                                nRecords++;
                                var payload = this.requestPayload(chargeData[i]);
                                 DataManager.create("/Batches", payload, 
                                    jQuery.proxy(function(oData){ 
                                        nRecCreated++;
                                        if (nRecords === nRecCreated) {
                                            this.changeButtonVisibility("Create");
                                        }
                                    }, this),
                                    jQuery.proxy(function(oError){ 
                                            MessageToast.show(oError);
                                    }, this)
                                );
                            }
                        }
                    },this)   
                });
            },

            handleAddNewCharge:function(oEvent){

                var oLocalModel =this.getView().getModel("LocalModel");
                var strStore = this.getView().byId("cbStore").getSelectedKey();
                var strDept = this.getView().byId("cbDepartment").getSelectedKey();

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
                    this.byId("saveButton").setVisible(true);
                    this.byId("createChargeButton").setVisible(false);
                }else{
                    this.byId("saveButton").setVisible(false);
                    this.byId("createChargeButton").setVisible(true);
                    if(aCollection.length === 0)
                        this.rebindTable(this.oEditableTemplate, "Edit");
                }
                
                this.byId("cancelButton").setVisible(true);
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
                        var tempArr =[];
                        data.forEach((v, i) => {
                            var object = JSON.parse(JSON.stringify(v));  // this has to be done to remove the object reference in Arr.
                            delete object.Store;
                            delete object.Department;
                            object.ID="";
                            object.Store_StoreID=strStore;
                            object.UpdatedBatch = false;
                            tempArr.push(object);
                        },this);
                    
                        oLocalModel.setProperty("/Batches", tempArr);
                        this.changeButtonVisibility("Copy");
                    }    
                }, this));     
            },

            

    /**** not used ****/      
    
    /**/


    /*getViewSettingsDialog: function (sDialogFragmentName) {
                var pDialog = this._mViewSettingsDialogs[sDialogFragmentName];
                
                if (!pDialog) {
                    pDialog = Fragment.load({
                        id: this.getView().getId(),
                        name: sDialogFragmentName,
                        controller: this
                    }).then(function (oDialog) {
                        if (Device.system.desktop) {
                            oDialog.addStyleClass("sapUiSizeCompact");
                        }
                        return oDialog;
                    });
                    this._mViewSettingsDialogs[sDialogFragmentName] = pDialog;
                }
                return pDialog;
            },

            onCreate: function () {
                this.getViewSettingsDialog("com.sap.fiorichargeapp.view.fragment.CreateChargeFromCentral")
                    .then(function (oViewSettingsDialog) {
                        oViewSettingsDialog.open();
                    });
            },

            handleClose: function(){
                this.getViewSettingsDialog("com.sap.fiorichargeapp.view.fragment.CreateChargeFromCentral")
                    .then(function (oViewSettingsDialog) {
                        oViewSettingsDialog.close();
                    });
            }*/  
            /*
            new Input({
                            id:"inpTuesday",
                            value: "{LocalModel>Time_Tuesday}",
                            valueState: "{=${LocalModel>Active_Tuesday} === true?'Success':'None'}",
                            enabled: "{LocalModel>Active_Tuesday}",
                            editable: "{LocalModel>Active_Tuesday}",
                            liveChange: this.onLiveChange
                        }), new Input({
                            id:"inpWednesday",
                            value: "{LocalModel>Time_Wednesday}",
                            valueState: "{=${LocalModel>Active_Wednesday} === true?'Success':'None'}",
                            enabled: "{LocalModel>Active_Wednesday}",
                            editable: "{LocalModel>Active_Wednesday}",
                            liveChange: this.onLiveChange
                        }), new Input({
                            id:"inpThursday",
                            value: "{LocalModel>Time_Thursday}",
                            valueState: "{=${LocalModel>Active_Thursday} === true?'Success':'None'}",
                            enabled: "{LocalModel>Active_Thursday}",
                            editable: "{LocalModel>Active_Thursday}",
                            liveChange: this.onLiveChange
                        }), new Input({
                            id:"inpFriday",
                            value: "{LocalModel>Time_Friday}",
                            valueState: "{=${LocalModel>Active_Friday} === true?'Success':'None'}",
                            enabled: "{LocalModel>Active_Friday}",
                            editable: "{LocalModel>Active_Friday}",
                            liveChange: this.onLiveChange
                        }), new Input({
                            id:"inpSaturday",
                            value: "{LocalModel>Time_Saturday}",
                            valueState: "{=${LocalModel>Active_Saturday} === true?'Success':'None'}",
                            enabled: "{LocalModel>Active_Saturday}",
                            editable: "{LocalModel>Active_Saturday}",
                            liveChange: this.onLiveChange
                        }), new Input({
                            id:"inpSunday",
                            value: "{LocalModel>Time_Sunday}",
                            valueState: "{=${LocalModel>Active_Sunday} === true?'Success':'None'}",
                            enabled: "{LocalModel>Active_Sunday}",
                            editable: "{LocalModel>Active_Sunday}",
                            liveChange: this.onLiveChange
                        })*/
        });
    });
