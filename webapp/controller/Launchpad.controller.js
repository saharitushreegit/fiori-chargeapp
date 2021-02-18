sap.ui.define([
    //"sap/ui/core/mvc/Controller",
    "./BaseController",
    "sap/ui/model/json/JSONModel",
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
    function (BaseController, JSONModel) {
        "use strict";

        return BaseController.extend("com.sap.fiorichargeapp.controller.Launchpad", {
            onInit: function () {
                this.oRouter = new sap.ui.core.UIComponent.getRouterFor(this);
                this.oRouter.attachRouteMatched(this.onRouteMatched, this);
            },

            onRouteMatched: function (oEvent) {
                var oNameParameter = oEvent.getParameter("name");
                console.log("oNameParameter -->" + oNameParameter);

            },

            handleTileManageCharge:function(oEvent){
                this.getRouter().navTo("Overview");
            },

            handleTileAdmin:function(oEvent){
               // this.getRouter().navTo("Admin");
               alert("In the process of Creation");
            }

        });    
    });    
    