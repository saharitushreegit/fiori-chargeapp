sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
     "sap/ui/model/FilterOperator",
     "sap/m/ColumnListItem",
    "sap/m/Input",
    "sap/m/ObjectStatus",
    'sap/base/util/deepExtend',
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
	function (Controller,JSONModel,Filter,FilterOperator,ColumnListItem,Input,ObjectStatus,deepExtend) {
		"use strict";

		return Controller.extend("com.sap.fiorichargeapp.controller.Overview", {
			onInit: function () {
                this.oRouter = new sap.ui.core.UIComponent.getRouterFor(this);
                console.log("in controller label id -->");
                var oFilterModel = new JSONModel({
                    Stores :[],
                    Bafs   : [],
                    STORE_BAF_BATCH_DAY:[]
                })
                this.getView().setModel(oFilterModel, "LocalModel");  
                this.loadStores();  
                this.loadBafs();
                this.oReadOnlyTemplate = this.byId("tbCharge").getBindingInfo("items").template;//this.byId("tbCharge").removeItem(0);
                //this.rebindTable(this.oReadOnlyTemplate, "Navigation");
                this.oEditableTemplate = new ColumnListItem({
                    cells: [
                        new ObjectStatus({
                            text:"{LocalModel>BatchID}"
                        }),
                        new Input({
                            value: "{LocalModel>Time_Monday}"
                        }), new Input({
                            value: "{LocalModel>Time_Tuesday}"
                        }), new Input({
                            value: "{LocalModel>Time_Wednesday}"
                        }), new Input({
                            value: "{LocalModel>Time_Thursday}"
                        }), new Input({
                            value: "{LocalModel>Time_Friday}"
                        }), new Input({
                            value: "{LocalModel>Time_Saturday}"
                        }), new Input({
                            value: "{LocalModel>Time_Sunday}"
                        })
                    ]
                });    
                    
                    
                    this.oRouter.attachRoutePatternMatched(this.onRouteMatched, this);
                },
                
                rebindTable: function(oTemplate, sKeyboardMode) {
                    this.getView().byId("tbCharge").bindItems({
                        path: "LocalModel>/STORE_BAF_BATCH_DAY",
                        template: oTemplate,
                        templateShareable: true
                    }).setKeyboardMode(sKeyboardMode);

                    this.getView().byId("tbCharge").getBinding("items").filter(this.oFilter);
                    
                },

                onEdit: function() {
                    this.aProductCollection = deepExtend([], this.getView().getModel("LocalModel").getProperty("/STORE_BAF_BATCH_DAY"));
                    this.byId("editButton").setVisible(false);
                    this.byId("saveButton").setVisible(true);
                    this.byId("cancelButton").setVisible(true);
                    this.rebindTable(this.oEditableTemplate, "Edit");
                },

                onSave: function() {

                    var oModel = this.getView().getModel();
                    var oLocalModel = this.getView().getModel("LocalModel");
                    this.byId("saveButton").setVisible(false);
                    this.byId("cancelButton").setVisible(false);
                    this.byId("editButton").setVisible(true);

                    var chargeData = oLocalModel.getProperty("/STORE_BAF_BATCH_DAY");

                   /* oModel.update("/STORE_BAF_BATCH_DAY('" + this.entityId + "')", entityData, {
                        success: $.proxy(function() {
                            
                        }, this),
                        error: $.proxy(function() {
                            
                        }, this)
                    });*/



                    this.rebindTable(this.oReadOnlyTemplate, "Navigation");
                },

                onCancel: function() {
                    this.byId("cancelButton").setVisible(false);
                    this.byId("saveButton").setVisible(false);
                    this.byId("editButton").setVisible(true);
                    this.getView().getModel("LocalModel").setProperty("/STORE_BAF_BATCH_DAY",this.aProductCollection);
                    this.rebindTable(this.oReadOnlyTemplate, "Navigation");
                },

                loadStores:function(){

                    var oLocalModel = this.getView().getModel("LocalModel");
                    var oModel = this.getView().getModel();
                    
                    oModel.read("/Stores",{
                        success:$.proxy(function(oData){
                            oLocalModel.setProperty("/Stores",oData.results);
                        },this),
                        failed:$.proxy(function(oError){
                        
                        },this)

                    })                   

            },

            loadBafs:function(){
                var oLocalModel = this.getView().getModel("LocalModel");
                var oModel = this.getView().getModel();
                
                oModel.read("/Bafs",{
                    success:$.proxy(function(oData){
                       oLocalModel.setProperty("/Bafs",oData.results);
                    },this),
                    failed:$.proxy(function(oError){
                    
                    },this)

                })         
            },

            handleStoreChange:function(oEvent){
                var filters = [];
                var selectedStore = oEvent.oSource.getSelectedKey();
                if (selectedStore.length > 0) {
				    filters = [new sap.ui.model.Filter("StoreID", sap.ui.model.FilterOperator.EQ, selectedStore)];
                }
                
                this.getView().byId("cbBaf").getBinding("items").filter(filters);
			    this.getView().byId("cbBaf").setSelectedItemId("");

               console.log("selectedStore >>>"+ selectedStore);
            },

            handleOnSearch : function(oEvent){

                var strStore = this.getView().byId("cbStore").getSelectedKey();
                var strBaf =  this.getView().byId("cbBaf").getSelectedKey();
                var valBaf = this.getView().byId("cbBaf").getValue();

                var oLocalModel = this.getView().getModel("LocalModel");
                var oModel = this.getView().getModel();

                var storeFilter = new Filter("StoreID", FilterOperator.EQ, strStore);
                var bafFilter = new Filter("BafID", FilterOperator.EQ, strBaf);

                this.oFilter = new Filter({
                    filters:[storeFilter, bafFilter], 
                    and:true
                });
                
                oModel.read("/STORE_BAF_BATCH_DAY",{
                    success:$.proxy(function(oData){
                       oLocalModel.setProperty("/STORE_BAF_BATCH_DAY",oData.results);
                       this.getView().byId("tbCharge").getBinding("items").filter(this.oFilter);
                      // this.getView().byId("tbChargeEditable").getBinding("items").filter(oFilter);
                       
                       this.getView().byId("tbHeaderTitle").setText("Store : "+strStore+" - "+valBaf);
                      // this.getView().byId("tbHeaderTitleEdit").setText("Store : "+strStore+" - "+valBaf);
                    },this),
                    failed:$.proxy(function(oError){
                    
                    },this)

                })    
            },

          

		    onRouteMatched: function(oEvent) {
                var oNameParameter = oEvent.getParameter("name");
                console.log("oNameParameter -->"+oNameParameter);

            }    



		});
	});
