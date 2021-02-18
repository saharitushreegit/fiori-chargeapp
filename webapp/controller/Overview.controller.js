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
                    Batches: []
                });
                this.getView().setModel(oFilterModel, "LocalModel");
               
                this.oReadOnlyTemplate = this.byId("tbCharge").getBindingInfo("items").template;//this.byId("tbCharge").removeItem(0);
                this.initializeEditableTemplate();
                this.oRouter.attachRouteMatched(this.onRouteMatched, this);
            },

            onRouteMatched: function (oEvent) {
                var oNameParameter = oEvent.getParameter("name");
                var oView = this.getView();
                console.log("oNameParameter -->" + oNameParameter);
                if(oNameParameter === "Admin"){
                    this.loadStores("Admin");
                    this.loadDepartment();
                }else{
                    oView.byId("cbStore").setValue(" ");
                    oView.byId("cbDepartment").setValue(" ");
                    oView.getModel("LocalModel").setProperty("/Batches",[]);
                    oView.getModel("LocalModel").setProperty("/Stores",[]);
                    oView.getModel("LocalModel").setProperty("/Departments",[]);
                    this.loadStores();
                    this.loadDepartment();
                }
            },

            loadStores: function (strRole) {

                var oLocalModel = this.getView().getModel("LocalModel");
                var oModel = this.getOwnerComponent().getModel();//this.getView().getModel();
                var filter=[];
                
                filter.push(new Filter("StoreID", FilterOperator.NE, '9999'));
                
                DataManager.read(oModel,"/Stores",filter,"",jQuery.proxy(function(oData) {
                    oLocalModel.setProperty("/Stores", oData.results);
                },this), jQuery.proxy(function(oError){

                },this));
             },

            loadDepartment: function () {
                var oLocalModel = this.getView().getModel("LocalModel");
                var oModel = this.getOwnerComponent().getModel();//this.getView().getModel();

                DataManager.read(oModel,"/Departments","","",jQuery.proxy(function(oData) {
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

                DataManager.read(oModel,"/StoresToDepartments",filter,"",jQuery.proxy(function(oData) {
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

                var expand = "Store,Department"

                DataManager.read(oModel,"/Batches",filter,expand,jQuery.proxy(function(oData) {
                    if(oData.results.length >0){
                        for (var i = 0; i < oData.results.length; i++) {
                            oData.results[i].UpdatedBatch = false;
                        }
                        oLocalModel.setProperty("/Batches", oData.results);
                        this.byId("editButton").setVisible(true);
                        this.byId("btCreateCharge").setVisible(false);
                    }else{
                        this.loadCentralStoreCharge();
                        $.when(this.loadCentralStoreDeferred).done($.proxy(function() {
                            var tempBatchCentral = this.arrBatchCentral;
                            if(tempBatchCentral.length >0){
                                this.arrBatchCentral=[];
                                for (var i = 0; i < tempBatchCentral.length; i++) {
                                    tempBatchCentral[i].ID="";
                                    tempBatchCentral[i].Store_StoreID=strStore;
                                    tempBatchCentral[i].UpdatedBatch = false;
                                }
                                oLocalModel.setProperty("/Batches", tempBatchCentral);
                                this.rebindTable(this.oEditableTemplate, "Edit");   
                                this.byId("editButton").setVisible(false);
                                this.byId("cancelButton").setVisible(false);
                                this.byId("btCreateCharge").setVisible(true);
                                this.byId("linkAddCharge").setVisible(true);
                            }else{
                                this.byId("editButton").setVisible(false);
                                this.byId("cancelButton").setVisible(false);
                                this.byId("btCreateCharge").setVisible(false);
                                this.byId("linkAddCharge").setVisible(true);
                            }    
                        }, this));
                    }       
                    this.updateTableTitle(); 
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

                DataManager.read(oModel,"/Batches",filter,"",jQuery.proxy(function(oData) {
                    this.arrBatchCentral = oData.results;
                    this.loadCentralStoreDeferred.resolve();
                },this), jQuery.proxy(function(oError){
                   this.loadCentralStoreDeferred.reject();     
                },this));
            },

            updateTableTitle:function(){
                var oView = this.getView();
                var strStore = oView.byId("cbStore").getSelectedKey();
                var strDepartmentDesc = oView.byId("cbDepartment").getValue();
                
                oView.byId("tbHeaderTitle").setText("Store : " + strStore + " - " + strDepartmentDesc);;
                
            },

            initializeEditableTemplate: function () {
                this.oEditableTemplate = new ColumnListItem({
                    cells: [
                        new ObjectStatus({
                            text: "{LocalModel>BatchID}"
                        }),
                        new TimePicker({
                            valueState: "{=${LocalModel>Active_Monday} === true?'Success':'None'}",
                            valueFormat:"HH:mm:ss",
                            displayFormat:"HH:mm:ss",
                            change:this.handleChange,
                            support2400:true,
                            value:"{path :'LocalModel>Time_Monday', type: 'sap.ui.model.odata.type.Time'}"   
                        }),
                        new TimePicker({
                            valueState: "{=${LocalModel>Active_Tuesday} === true?'Success':'None'}",
                            valueFormat:"HH:mm:ss",
                            displayFormat:"HH:mm:ss",
                            change:this.handleChange,
                            support2400:true,
                            value:"{path :'LocalModel>Time_Tuesday', type: 'sap.ui.model.odata.type.Time'}"   
                        }),
                        new TimePicker({
                            valueState: "{=${LocalModel>Active_Wednesday} === true?'Success':'None'}",
                            valueFormat:"HH:mm:ss",
                            displayFormat:"HH:mm:ss",
                            change:this.handleChange,
                            support2400:true,
                            value:"{path :'LocalModel>Time_Wednesday', type: 'sap.ui.model.odata.type.Time'}"   
                        }),
                        new TimePicker({
                            valueState: "{=${LocalModel>Active_Thursday} === true?'Success':'None'}",
                            valueFormat:"HH:mm:ss",
                            displayFormat:"HH:mm:ss",
                            change:this.handleChange,
                            support2400:true,
                            value:"{path :'LocalModel>Time_Thursday', type: 'sap.ui.model.odata.type.Time'}"   
                        }),
                        new TimePicker({
                            valueState: "{=${LocalModel>Active_Friday} === true?'Success':'None'}",
                            valueFormat:"HH:mm:ss",
                            displayFormat:"HH:mm:ss",
                            change:this.handleChange,
                            support2400:true,
                            value:"{path :'LocalModel>Time_Friday', type: 'sap.ui.model.odata.type.Time'}"   
                        }),
                        new TimePicker({
                            valueState: "{=${LocalModel>Active_Saturday} === true?'Success':'None'}",
                            valueFormat:"HH:mm:ss",
                            displayFormat:"HH:mm:ss",
                            change:this.handleChange,
                            support2400:true,
                            value:"{path :'LocalModel>Time_Saturday', type: 'sap.ui.model.odata.type.Time'}"   
                        }),
                        new TimePicker({
                            valueState: "{=${LocalModel>Active_Sunday} === true?'Success':'None'}",
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
                    template: oTemplate,
                    templateShareable: true
                }).setKeyboardMode(sKeyboardMode);
            },

            handleEdit: function (oEvent) {
                this.aProductCollection = deepExtend([], this.getView().getModel("LocalModel").getProperty("/Batches"));
                this.byId("editButton").setVisible(false);
                this.byId("saveButton").setVisible(true);
                this.byId("cancelButton").setVisible(true);
                this.byId("linkAddCharge").setVisible(true);
                this.updateTableTitle();
                this.rebindTable(this.oEditableTemplate, "Edit");
            },

            handleCancel: function () {
                this.byId("cancelButton").setVisible(false);
                this.byId("saveButton").setVisible(false);
                this.byId("editButton").setVisible(true);
                this.getView().getModel("LocalModel").setProperty("/Batches", this.aProductCollection);
                this.updateTableTitle();
                this.rebindTable(this.oReadOnlyTemplate, "Navigation");
            },

            handleChange: function (oEvent) {
               
                var oLocalModel = this.getModel("LocalModel");
                var i = oEvent.getSource();
                var inpId = oEvent.getParameter("id");
                var value = oEvent.getParameter("value");

                var sPath = i.getParent().getBindingContext("LocalModel").sPath;
                oLocalModel.setProperty(sPath + "/UpdatedBatch", true);
            },

            handleChargeUpdate: function (oEvent) {

                 this.chargeUpdateDeferred = $.Deferred();

                var oModel = this.getOwnerComponent().getModel();//this.getView().getModel();
                var oLocalModel = this.getView().getModel("LocalModel");

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
                this.updateTableTitle();
                
                /// segregate update and new creation
                MessageBox.confirm("Do you want to Update Charge ?", {
                    title: "Confirm",
                    onClose: $.proxy(function (oAction) {
                        if (oAction === MessageBox.Action.OK) {

                            for (var i = 0; i < chargeDataUpdated.length; i++) {
                                strDepdesc = chargeDataUpdated[i].Department.DepartmentDescription;
                                if (chargeDataUpdated[i].ID !=="" && chargeDataUpdated[i].UpdatedBatch === true) {
                                    nRecords=nRecords+1;
                                    var payload = this.requestPayload(chargeDataUpdated[i]);
                                    oModel.update("/Batches(guid'"+chargeDataUpdated[i].ID+"')", payload, {
                                        success: $.proxy(function (oData) {
                                            nRecUpdated=nRecUpdated+1;
                                            if (nRecords === nRecUpdated) {
                                                this.chargeUpdateDeferred.resolve();
                                            }
                                        }, this),
                                        error: $.proxy(function (error) {
                                            MessageToast.show(error); 
                                            this.chargeUpdateDeferred.reject();   
                                        }, this)
                                    });
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
                                            success: $.proxy(function (oData) {
                                                nRecCreated=nRecCreated+1;
                                                if (nRecordsCreated === nRecCreated) {
                                                     this.changeButtonVisibility();
                                                }
                                            }, this),
                                            error: $.proxy(function () {
                                                MessageToast.show(error); 
                                            }, this)
                                        });
                                    } 
                                }else{
                                    this.changeButtonVisibility();
                                }   
                            }, this));

                        }
                    },this)   
                });
            },

            changeButtonVisibility:function(){
                this.byId("btCreateCharge").setVisible(false);
                this.byId("cancelButton").setVisible(false);
                this.byId("linkAddCharge").setVisible(false);
                this.byId("saveButton").setVisible(false);
                this.byId("editButton").setVisible(true);
                this.rebindTable(this.oReadOnlyTemplate, "Navigation");
            },

            requestPayload:function(chargeData){
                var payload = {
                    "Store_StoreID": chargeData.Store_StoreID,
                    "Department_DepartmentID": chargeData.Department_DepartmentID,
                    "BatchID": chargeData.BatchID,
                    "Active_Monday": chargeData.Active_Monday,
                    "Active_Tuesday": chargeData.Active_Tuesday,
                    "Active_Wednesday": chargeData.Active_Wednesday,
                    "Active_Thursday": chargeData.Active_Thursday,
                    "Active_Friday": chargeData.Active_Friday,
                    "Active_Saturday": chargeData.Active_Saturday,
                    "Active_Sunday": chargeData.Active_Sunday,
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
                                chargeData.splice(indexToDelete, 1);
                                oLocalModel.setProperty("/Batches", chargeData);
                                oModel.remove("/Batches(guid'"+selectedBatch.ID+"')", {
                                    success: $.proxy(function() {
                                        this.byId("btCreateCharge").setVisible(false);
                                        this.byId("cancelButton").setVisible(false);
                                        this.byId("saveButton").setVisible(false);
                                        this.byId("editButton").setVisible(false);
                                        this.byId("linkAddCharge").setVisible(true);
                                        
                                        MessageToast.show("Charge "+selectedBatch.BatchID+" for Department "+ valDept + " is deleted.");
                                    }, this),
                                    error: $.proxy(function() {
                                        
                                    }, this)
                                });
                            }else{
                                chargeData.splice(indexToDelete, 1);
                                oLocalModel.setProperty("/Batches", chargeData);
                                this.byId("btCreateCharge").setVisible(false);
                                this.byId("cancelButton").setVisible(false);
                                this.byId("saveButton").setVisible(false);
                                this.byId("editButton").setVisible(false);
                                this.byId("linkAddCharge").setVisible(true);
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
                                oModel.create("/Batches", payload, {
                                    success: $.proxy(function (oData) {
                                        nRecCreated++;
                                        if (nRecords === nRecCreated) {
                                            this.changeButtonVisibility();
                                        }
                                    }, this),
                                    error: $.proxy(function () {

                                    }, this)
                                });
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
					"Active_Monday": true,
                    "Time_Monday": null,
                    "Active_Tuesday": true,
                    "Time_Tuesday": null,
                    "Active_Wednesday": true,
                    "Time_Wednesday": null,
                    "Active_Thursday": true,
                    "Time_Thursday": null,
                    "Active_Friday": true,
                    "Time_Friday": null,
                    "Active_Saturday": true,
                    "Time_Saturday": null,
                    "Active_Sunday": true,
                    "Time_Sunday": null,
                    "Store_StoreID":strStore,
                    "Department_DepartmentID":strDept
                };
                
                if(chargeDataUpdated.length >0){
                    this.byId("saveButton").setVisible(true);
                    this.byId("btCreateCharge").setVisible(false);
                }else{
                    this.byId("saveButton").setVisible(false);
                    this.byId("btCreateCharge").setVisible(true);
                    if(aCollection.length === 0)
                        this.rebindTable(this.oEditableTemplate, "Edit");
                    
                }
                
                this.byId("cancelButton").setVisible(true);
                //
                aCollection.push(newEntry);
			    oLocalModel.setProperty("/Batches", aCollection);
            }

            

    /**** not used ****/      
    
    /*handleCopyFromCentral:function(){
                var oLocalModel = this.getView().getModel("LocalModel");
                var oModel = this.getOwnerComponent().getModel();//this.getView().getModel();

                var strStore = this.getView().byId("cbStore").getSelectedKey();    
                var strBaf = this.getView().byId("cbDepartment").getSelectedKey();
                
                var storeFilter = new Filter("Store_StoreID", FilterOperator.EQ, '9999');
                var depFilter = new Filter("Department_DepartmentID", FilterOperator.EQ, strBaf);

                var tempFilter = []
                tempFilter.push(storeFilter);
                tempFilter.push(depFilter);

                oModel.read("/Batches", {
                    filters: tempFilter,
                    success: $.proxy(function (oData) {
                        for (var i = 0; i < oData.results.length; i++) {
                            oData.results[i].StoreID=strStore;
                            oData.results[i].UpdatedBatch = false;
                        }
                        oLocalModel.setProperty("/Batches", oData.results);
                        this.rebindTable(this.oEditableTemplate, "Edit");   
                        this.getView().byId("btCopyfromCentral").setVisible(false);
                        this.getView().byId("btCreate").setVisible(true);
                        this.getView().byId("cancelButton").setVisible(true);
                    }, this),
                    failed: $.proxy(function (oError) {

                    }, this)
                }, this)
            },*/


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
