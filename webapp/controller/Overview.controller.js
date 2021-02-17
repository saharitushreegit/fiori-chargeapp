sap.ui.define([
    //"sap/ui/core/mvc/Controller",
    "./BaseController",
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
    function (BaseController, JSONModel, Filter, FilterOperator, ColumnListItem, Input, ObjectStatus, 
        deepExtend, ValueState, MessageBox,Fragment,Device,TimePicker,MessageToast) {
        "use strict";

        return BaseController.extend("com.sap.fiorichargeapp.controller.Overview", {
            onInit: function () {
                this.oRouter = new sap.ui.core.UIComponent.getRouterFor(this);
                var oFilterModel = new JSONModel({
                    Stores: [],
                    Departments: [],
                    Batches: []
                })

                //this._mViewSettingsDialogs={};
                this.getView().setModel(oFilterModel, "LocalModel");
                this.byId("editButton").setVisible(false);
                this.byId("btCreate").setVisible(false);
                this.byId("cancelButton").setVisible(false);
                this.byId("saveButton").setVisible(false);
                
                this.oReadOnlyTemplate = this.byId("tbCharge").getBindingInfo("items").template;//this.byId("tbCharge").removeItem(0);
                //this.rebindTable(this.oReadOnlyTemplate, "Navigation");
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
                    this.loadStores();
                    this.loadDepartment();
                }

            },

            loadStores: function (strRole) {

                var oLocalModel = this.getView().getModel("LocalModel");
                var oModel = this.getOwnerComponent().getModel();//this.getView().getModel();
                var tempFilter=[];
                if(strRole === "Admin"){
                    tempFilter.push(new Filter("StoreID", FilterOperator.EQ, '9999'));
                }else{
                    tempFilter.push(new Filter("StoreID", FilterOperator.NE, '9999'));
                }
                
                oModel.read("/Stores", {
                    filters: tempFilter,
                    success: $.proxy(function (oData) {
                        oLocalModel.setProperty("/Stores", oData.results);
                    }, this),
                    failed: $.proxy(function (oError) {

                    }, this)

                })

            },

            loadDepartment: function () {
                console.log("loadDepartment");
                var oLocalModel = this.getView().getModel("LocalModel");
                var oModel = this.getOwnerComponent().getModel();//this.getView().getModel();

                oModel.read("/Departments", {
                    success: $.proxy(function (oData) {
                        oLocalModel.setProperty("/Departments", oData.results);
                    }, this),
                    failed: $.proxy(function (oError) {
                        console.log(oError)
                    }, this)

                })
            },

            handleStoreChange: function (oEvent) {
                console.log("handleStoreChange");
                var oLocalModel = this.getView().getModel("LocalModel");
                var oModel = this.getOwnerComponent().getModel();
                var filters = [];
                var selectedStore = oEvent.oSource.getSelectedKey();
                var cbDepartment =this.getView().byId("cbDepartment");
                console.log("selectedStore >>"+selectedStore);
                if (selectedStore.length > 0) {
                    filters = [new sap.ui.model.Filter("StoreID", sap.ui.model.FilterOperator.EQ, selectedStore)];
                }

                oModel.read("/StoresToDepartments", {
                    filters:filters,
                    success: $.proxy(function (oData) {
                        var filterDep=[];
                        for (var i = 0; i < oData.results.length; i++) {
                            filterDep.push(new Filter("DepartmentID" , FilterOperator.EQ, oData.results[i].DepartmentID));
                        }
                        cbDepartment.getBinding("items").filter(filterDep);
                        cbDepartment.setSelectedItemId("");
                    }, this),
                    failed: $.proxy(function (oError) {

                    }, this)

                })
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

                var storeFilter = new Filter("Store_StoreID", FilterOperator.EQ, strStore);
                var depFilter = new Filter("Department_DepartmentID", FilterOperator.EQ, strDepartmentID);

                var tempFilter = []
                tempFilter.push(storeFilter);
                tempFilter.push(depFilter);

                oModel.read("/Batches", {
                    filters: tempFilter,
                    urlParameters: {
                        "$expand": "Store,Department"
                    },
                    success: $.proxy(function (oData) {

                        for (var i = 0; i < oData.results.length; i++) {
                            oData.results[i].UpdatedBatch = false;
                        }
                        oLocalModel.setProperty("/Batches", oData.results);
                        if(oData.results.length >0){
                            this.byId("editButton").setVisible(true);
                            this.byId("btCopyfromCentral").setVisible(false);
                        }else{
                            this.byId("btCopyfromCentral").setVisible(true);
                            this.byId("editButton").setVisible(false);
                        }        
                        this.getView().byId("tbHeaderTitle").setText("Store : " + strStore + " - " + valBaf);
                    }, this),
                    failed: $.proxy(function (oError) {

                    }, this)

                }, this)
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

            handleEdit: function () {
                this.aProductCollection = deepExtend([], this.getView().getModel("LocalModel").getProperty("/Batches"));
                this.byId("editButton").setVisible(false);
                this.byId("saveButton").setVisible(true);
                this.byId("cancelButton").setVisible(true);
                this.rebindTable(this.oEditableTemplate, "Edit");
            },

            handleSave: function () {

                var oModel = this.getOwnerComponent().getModel();//this.getView().getModel();
                var oLocalModel = this.getView().getModel("LocalModel");

                var strDepdesc ="";
                var chargeData = oLocalModel.getProperty("/Batches");
                var nRecords = 0;
                var nRecUpdated = 0;
                MessageBox.confirm("Do you want to Update Charge ?", {
                    title: "Confirm",
                    onClose: $.proxy(function (oAction) {
                        if (oAction === MessageBox.Action.OK) {

                            for (var i = 0; i < chargeData.length; i++) {
                                strDepdesc = chargeData[i].Department.DepartmentDescription;
                                if (chargeData[i].UpdatedBatch === true) {
                                    nRecords++;
                                    var payload = {
                                        "Store_StoreID": chargeData[i].Store_StoreID,
                                        "Department_DepartmentID": chargeData[i].Department_DepartmentID,
                                        "BatchID": chargeData[i].BatchID,
                                        "Active_Monday": chargeData[i].Active_Monday,
                                        "Active_Tuesday": chargeData[i].Active_Tuesday,
                                        "Active_Wednesday": chargeData[i].Active_Wednesday,
                                        "Active_Thursday": chargeData[i].Active_Thursday,
                                        "Active_Friday": chargeData[i].Active_Friday,
                                        "Active_Saturday": chargeData[i].Active_Saturday,
                                        "Active_Sunday": chargeData[i].Active_Sunday,
                                        "Time_Monday": chargeData[i].Time_Monday,
                                        "Time_Tuesday": chargeData[i].Time_Tuesday,
                                        "Time_Wednesday": chargeData[i].Time_Wednesday,
                                        "Time_Thursday": chargeData[i].Time_Thursday,
                                        "Time_Friday": chargeData[i].Time_Friday,
                                        "Time_Saturday": chargeData[i].Time_Saturday,
                                        "Time_Sunday": chargeData[i].Time_Sunday,
                                    }
                                    oModel.update("/Batches(guid'"+chargeData[i].ID+"')", payload, {
                                        success: $.proxy(function (oData) {
                                            nRecUpdated++;
                                            this.byId("saveButton").setVisible(false);
                                            this.byId("cancelButton").setVisible(false);
                                            this.byId("editButton").setVisible(true);
                                            if (nRecords === nRecUpdated) {
                                                if(nRecords === 1)
                                                    MessageToast.show("Charge for Department "+ strDepdesc + " are updated.");
                                                else
                                                    MessageToast.show("Charges for Department "+ strDepdesc + " are updated.");
                                                this.rebindTable(this.oReadOnlyTemplate, "Navigation");
                                            }
                                        }, this),
                                        error: $.proxy(function (error) {
                                            MessageToast.show(error);    
                                        }, this)
                                    });
                                }
                            }
                        }
                    },this)   
                });
            },

            handleCancel: function () {
                this.byId("cancelButton").setVisible(false);
                this.byId("saveButton").setVisible(false);
                this.byId("editButton").setVisible(true);
                this.getView().getModel("LocalModel").setProperty("/Batches", this.aProductCollection);
                this.rebindTable(this.oReadOnlyTemplate, "Navigation");
            },

            handleChange: function (oEvent) {
                console.log("tset");
                var oLocalModel = this.getModel("LocalModel");
                var i = oEvent.getSource();
                var inpId = oEvent.getParameter("id");
                var value = oEvent.getParameter("value");

                var sPath = i.getParent().getBindingContext("LocalModel").sPath;
                oLocalModel.setProperty(sPath + "/UpdatedBatch", true);
            },

            handleChargeDelete:function(oEvent){

                var oModel = this.getOwnerComponent().getModel(); //this.getView().getModel();
                var oLocalModel = this.getView().getModel("LocalModel");    
                var oParameter = oEvent.getParameter("listItem");
                var selectedBatch = oParameter.getBindingContext("LocalModel").getObject();
                var path = oParameter.getBindingContext("LocalModel").getPath();
                var indexToDelete = path.substring(path.lastIndexOf("/") + 1);
                var chargeData = oLocalModel.getProperty("/Batches");

                MessageBox.confirm("Are you Sure you want to Delete the Batch ?", {
				title: "Confirm",
				onClose: $.proxy(function(oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            chargeData.splice(indexToDelete, 1);
							oLocalModel.setProperty("/Batches", chargeData);
							oModel.remove("/Batches(guid'"+selectedBatch.ID+"')", {
								success: $.proxy(function() {
										MessageToast.show("Charge "+selectedBatch.BatchID+" for Department "+ selectedBatch.Department.DepartmentDescription + " is deleted.");
								}, this),
								error: $.proxy(function() {
									
								}, this)
							});
                        }
                    },this)   
                });    
            },

            

            handleCopyFromCentral:function(){
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
            },

            handleCreateBatch:function(oEvent){

                var strStore = this.getView().byId("cbStore").getSelectedKey();
                var strBaf = this.getView().byId("cbDepartment").getSelectedKey();
                var oModel = this.getOwnerComponent().getModel(); //this.getView().getModel();
                var oLocalModel = this.getView().getModel("LocalModel");

                var chargeData = oLocalModel.getProperty("/Batches");
                var nRecords=0;
                var nRecCreated=0;
                MessageBox.confirm("Do you want to Create a Charge for Store "+strStore+" and Department "+strBaf+"?", {
                    title: "Confirm",
                    onClose: $.proxy(function (oAction) {
                        if (oAction === MessageBox.Action.OK) {

                            //oModel.setDeferredGroups(["CreateBatch"]);
                            for (var i = 0; i < chargeData.length; i++) {
                                nRecords++;
                                var payload = {
                                    "Store_StoreID": chargeData[i].StoreID,
                                    "Department_DepartmentID": chargeData[i].Department_DepartmentID,
                                    "BatchID": chargeData[i].BatchID,
                                    "Active_Monday": chargeData[i].Active_Monday,
                                    "Active_Tuesday": chargeData[i].Active_Tuesday,
                                    "Active_Wednesday": chargeData[i].Active_Wednesday,
                                    "Active_Thursday": chargeData[i].Active_Thursday,
                                    "Active_Friday": chargeData[i].Active_Friday,
                                    "Active_Saturday": chargeData[i].Active_Saturday,
                                    "Active_Sunday": chargeData[i].Active_Sunday,
                                    "Time_Monday": chargeData[i].Time_Monday,
                                    "Time_Tuesday": chargeData[i].Time_Tuesday,
                                    "Time_Wednesday": chargeData[i].Time_Wednesday,
                                    "Time_Thursday": chargeData[i].Time_Thursday,
                                    "Time_Friday": chargeData[i].Time_Friday,
                                    "Time_Saturday": chargeData[i].Time_Saturday,
                                    "Time_Sunday": chargeData[i].Time_Sunday,
                                }
                                oModel.create("/Batches", payload, {
                                    success: $.proxy(function (oData) {
                                        nRecCreated++;
                                        this.byId("btCreate").setVisible(false);
                                        this.byId("cancelButton").setVisible(false);
                                        this.byId("editButton").setVisible(true);
                                        if (nRecords === nRecCreated) {
                                            this.rebindTable(this.oReadOnlyTemplate, "Navigation");
                                        }
                                    }, this),
                                    error: $.proxy(function () {

                                    }, this)
                                });
                            }
                            //oModel.submitChanges("CreateBatch");
                        }
                    },this)   
                });
            }

            

    /**** not used ****/        

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
