sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/ColumnListItem",
    "sap/m/Input",
    "sap/m/ObjectStatus",
    'sap/base/util/deepExtend',
    'sap/ui/core/ValueState',
    'sap/m/MessageBox',
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
    function (Controller, JSONModel, Filter, FilterOperator, ColumnListItem, Input, ObjectStatus, deepExtend, ValueState, MessageBox) {
        "use strict";

        return Controller.extend("com.sap.fiorichargeapp.controller.Overview", {
            onInit: function () {
                this.oRouter = new sap.ui.core.UIComponent.getRouterFor(this);
                var oFilterModel = new JSONModel({
                    Stores: [],
                    Bafs: [],
                    STORE_BAF_BATCH_DAY: []
                })
                this.getView().setModel(oFilterModel, "LocalModel");
                this.byId("editButton").setVisible(false);
                this.loadStores();
                this.loadBafs();
                this.oReadOnlyTemplate = this.byId("tbCharge").getBindingInfo("items").template;//this.byId("tbCharge").removeItem(0);
                //this.rebindTable(this.oReadOnlyTemplate, "Navigation");
                this.initializeEditableTemplate();
                this.oRouter.attachRoutePatternMatched(this.onRouteMatched, this);
            },

            onRouteMatched: function (oEvent) {
                var oNameParameter = oEvent.getParameter("name");
                console.log("oNameParameter -->" + oNameParameter);

            },

            loadStores: function () {

                var oLocalModel = this.getView().getModel("LocalModel");
                var oModel = this.getView().getModel();

                oModel.read("/Stores", {
                    success: $.proxy(function (oData) {
                        oLocalModel.setProperty("/Stores", oData.results);
                    }, this),
                    failed: $.proxy(function (oError) {

                    }, this)

                })

            },

            loadBafs: function () {
                var oLocalModel = this.getView().getModel("LocalModel");
                var oModel = this.getView().getModel();

                oModel.read("/Bafs", {
                    success: $.proxy(function (oData) {
                        oLocalModel.setProperty("/Bafs", oData.results);
                    }, this),
                    failed: $.proxy(function (oError) {

                    }, this)

                })
            },

            handleStoreChange: function (oEvent) {
                var filters = [];
                var selectedStore = oEvent.oSource.getSelectedKey();
                if (selectedStore.length > 0) {
                    filters = [new sap.ui.model.Filter("StoreID", sap.ui.model.FilterOperator.EQ, selectedStore)];
                }

                this.getView().byId("cbBaf").getBinding("items").filter(filters);
                this.getView().byId("cbBaf").setSelectedItemId("");

                console.log("selectedStore >>>" + selectedStore);
            },

            handleOnSearch: function (oEvent) {

                var strStore = this.getView().byId("cbStore").getSelectedKey();
                var strBaf = this.getView().byId("cbBaf").getSelectedKey();
                var valBaf = this.getView().byId("cbBaf").getValue();

                var oLocalModel = this.getView().getModel("LocalModel");
                var oModel = this.getView().getModel();

                var storeFilter = new Filter("StoreID", FilterOperator.EQ, strStore);
                var bafFilter = new Filter("BafID", FilterOperator.EQ, strBaf);

                this.oFilter = new Filter({
                    filters: [storeFilter, bafFilter],
                    and: true
                });
                var tempFilter = []
                tempFilter.push(storeFilter);
                tempFilter.push(bafFilter);

                oModel.read("/STORE_BAF_BATCH_DAY", {
                    filters: tempFilter,
                    success: $.proxy(function (oData) {

                        for (var i = 0; i < oData.results.length; i++) {
                            oData.results[i].UpdatedBatch = false;
                        }
                        oLocalModel.setProperty("/STORE_BAF_BATCH_DAY", oData.results);
                        this.byId("editButton").setVisible(true);
                        //this.getView().byId("tbCharge").getBinding("items").filter(this.oFilter);

                        this.getView().byId("tbHeaderTitle").setText("Store : " + strStore + " - " + valBaf);
                        // this.getView().byId("tbHeaderTitleEdit").setText("Store : "+strStore+" - "+valBaf);
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
                        new Input({
                            value: "{LocalModel>Time_Monday}",
                            valueState: "{=${LocalModel>Active_Monday} === true?'Success':'None'}",
                            enabled: "{LocalModel>Active_Monday}",
                            editable: "{LocalModel>Active_Monday}",
                            liveChange: this.onLiveChange
                        }),
                        new Input({
                            value: "{LocalModel>Time_Tuesday}",
                            valueState: "{=${LocalModel>Active_Tuesday} === true?'Success':'None'}",
                            enabled: "{LocalModel>Active_Tuesday}",
                            editable: "{LocalModel>Active_Tuesday}",
                            liveChange: this.onLiveChange
                        }), new Input({
                            value: "{LocalModel>Time_Wednesday}",
                            valueState: "{=${LocalModel>Active_Wednesday} === true?'Success':'None'}",
                            enabled: "{LocalModel>Active_Wednesday}",
                            editable: "{LocalModel>Active_Wednesday}",
                            liveChange: this.onLiveChange
                        }), new Input({
                            value: "{LocalModel>Time_Thursday}",
                            valueState: "{=${LocalModel>Active_Thursday} === true?'Success':'None'}",
                            enabled: "{LocalModel>Active_Thursday}",
                            editable: "{LocalModel>Active_Thursday}",
                            liveChange: this.onLiveChange
                        }), new Input({
                            value: "{LocalModel>Time_Friday}",
                            valueState: "{=${LocalModel>Active_Friday} === true?'Success':'None'}",
                            enabled: "{LocalModel>Active_Friday}",
                            editable: "{LocalModel>Active_Friday}",
                            liveChange: this.onLiveChange
                        }), new Input({
                            value: "{LocalModel>Time_Saturday}",
                            valueState: "{=${LocalModel>Active_Saturday} === true?'Success':'None'}",
                            enabled: "{LocalModel>Active_Saturday}",
                            editable: "{LocalModel>Active_Saturday}",
                            liveChange: this.onLiveChange
                        }), new Input({
                            value: "{LocalModel>Time_Sunday}",
                            valueState: "{=${LocalModel>Active_Sunday} === true?'Success':'None'}",
                            enabled: "{LocalModel>Active_Sunday}",
                            editable: "{LocalModel>Active_Sunday}",
                            liveChange: this.onLiveChange
                        })
                    ]
                });
            },

            rebindTable: function (oTemplate, sKeyboardMode) {
                this.getView().byId("tbCharge").bindItems({
                    path: "LocalModel>/STORE_BAF_BATCH_DAY",
                    template: oTemplate,
                    templateShareable: true
                }).setKeyboardMode(sKeyboardMode);

                //this.getView().byId("tbCharge").getBinding("items").filter(this.oFilter);

            },

            onEdit: function () {
                this.aProductCollection = deepExtend([], this.getView().getModel("LocalModel").getProperty("/STORE_BAF_BATCH_DAY"));
                this.byId("editButton").setVisible(false);
                this.byId("saveButton").setVisible(true);
                this.byId("cancelButton").setVisible(true);
                this.rebindTable(this.oEditableTemplate, "Edit");
            },

            onSave: function () {

                var oModel = this.getView().getModel();
                var oLocalModel = this.getView().getModel("LocalModel");

                var chargeData = oLocalModel.getProperty("/STORE_BAF_BATCH_DAY");
                var nRecords = 0;
                var nRecUpdated = 0;
                MessageBox.confirm("Do you want to Update Charge ?", {
                    title: "Confirm",
                    onClose: $.proxy(function (oAction) {
                        if (oAction === MessageBox.Action.OK) {

                            oModel.setDeferredGroups(["UpdateCharge"]);
                            for (var i = 0; i < chargeData.length; i++) {
                                if (chargeData[i].UpdatedBatch === true) {
                                    nRecords++;
                                    var payload = {
                                        "StoreID": chargeData[i].StoreID,
                                        "BafID": chargeData[i].BafID,
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
                                    oModel.update("/STORE_BAF_BATCH_DAY(StoreID='" + chargeData[i].StoreID + "',BafID='" + chargeData[i].BafID + "',BatchID=" + chargeData[i].BatchID + ")", payload, {
                                        success: $.proxy(function () {
                                            nRecUpdated++;
                                            this.byId("saveButton").setVisible(false);
                                            this.byId("cancelButton").setVisible(false);
                                            this.byId("editButton").setVisible(true);
                                            if (nRecords === nRecUpdated) {
                                                this.rebindTable(this.oReadOnlyTemplate, "Navigation");
                                            }
                                        }, this),
                                        error: $.proxy(function () {

                                        }, this)
                                    });
                                }
                            }
                            oModel.submitChanges("UpdateCharge");
                        }
                    },this)   
                });
            },

            onCancel: function () {
                this.byId("cancelButton").setVisible(false);
                this.byId("saveButton").setVisible(false);
                this.byId("editButton").setVisible(true);
                this.getView().getModel("LocalModel").setProperty("/STORE_BAF_BATCH_DAY", this.aProductCollection);
                this.rebindTable(this.oReadOnlyTemplate, "Navigation");
            },

            onLiveChange: function (oEvent) {
                var oLocalModel = this.getModel("LocalModel");
                var i = oEvent.getSource();

                var sPath = i.getParent().getBindingContext("LocalModel").sPath;
                oLocalModel.setProperty(sPath + "/UpdatedBatch", true);
                /*if (i.getValue() !== "") {
                    this.timeout = setTimeout(function () {
                        i.getParent().getParent().focus();
                    }.bind(this), 2000);
			    }*/
            },

            onChargeDelete:function(oEvent){
                console.log(oEvent.getSource());
            },

            


        });
    });
