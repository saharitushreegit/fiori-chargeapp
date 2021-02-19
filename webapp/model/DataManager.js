sap.ui.define([], function() {
	"use strict";
	return {

        read : function(oModel, sPath, filter, expand, fnSuccess, fnFail){

            var urlParameter = {};
            if (expand !== "" ) {
				urlParameter = {
					"$expand": expand,
				};
            }
            
            oModel.read(sPath, {
                filters:filter,
				urlParameters: urlParameter,
				success: jQuery.proxy(fnSuccess, this),
				error: jQuery.proxy(fnFail, this)
			});
        },


        update : function(oModel, sPath, payload,fnSuccess, fnFail){
              oModel.update(sPath, payload , fnSucces, fnFail);
        }
    };
});