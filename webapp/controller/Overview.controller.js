sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
     "sap/ui/model/FilterOperator",
     "sap/m/ColumnListItem",
    "sap/m/Input",
    "sap/m/ObjectStatus"
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
	function (Controller,JSONModel,Filter,FilterOperator,ColumnListItem,Input,ObjectStatus) {
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

                
                
                this.oRouter.attachRoutePatternMatched(this.onRouteMatched, this);
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

                var oFilter = new Filter({
                    filters:[storeFilter, bafFilter], 
                    and:true
                });
                
                oModel.read("/STORE_BAF_BATCH_DAY",{
                    success:$.proxy(function(oData){
                       oLocalModel.setProperty("/STORE_BAF_BATCH_DAY",oData.results);
                       this.getView().byId("tbCharge").getBinding("items").filter(oFilter);
                      // this.getView().byId("tbChargeEditable").getBinding("items").filter(oFilter);
                       
                       this.getView().byId("tbHeaderTitle").setText("Store : "+strStore+" - "+valBaf);
                      // this.getView().byId("tbHeaderTitleEdit").setText("Store : "+strStore+" - "+valBaf);
                    },this),
                    failed:$.proxy(function(oError){
                    
                    },this)

                })    
            },

          

		onEdit: function() {
			this.byId("editButton").setVisible(false);
			this.byId("saveButton").setVisible(true);
            this.byId("cancelButton").setVisible(true);
            

		},

		onSave: function() {
			this.byId("saveButton").setVisible(false);
			this.byId("cancelButton").setVisible(false);
			this.byId("editButton").setVisible(true);
		},

		onCancel: function() {
			this.byId("cancelButton").setVisible(false);
			this.byId("saveButton").setVisible(false);
			this.byId("editButton").setVisible(true);
		},


            onRouteMatched: function(oEvent) {
                var oNameParameter = oEvent.getParameter("name");
                console.log("oNameParameter -->"+oNameParameter);

            }    



		});
	});
