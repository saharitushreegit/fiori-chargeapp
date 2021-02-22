sap.ui.define([], function() {
	"use strict";
	return {

        read : function(oModel, sPath, filter, urlParameter, fnSuccess, fnFail){

            oModel.read(sPath, {
                filters:filter,
				urlParameters: urlParameter,
				success: jQuery.proxy(fnSuccess, this),
				error: jQuery.proxy(fnFail, this)
			});
        },


        update : function(oModel, sPath, payload,fnSuccess, fnFail){
              oModel.update(sPath, payload , fnSuccess, fnFail);
        },

        create:function(oModel,sPath, payload,fnSuccess, fnFail){
            oModel.create(sPath, payload , fnSuccess, fnFail);
        },

        delete: function(oModel, sPath,fnSuccess, fnFail){
              oModel.remove(sPath, fnSuccess, fnFail);
        },
    };
});