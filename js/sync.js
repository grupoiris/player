/*! web worker calls */
self.addEventListener('message', function(e) {
	var obj = JSON.parse(e.data);
	switch (obj.fun) {
		case "sincronizar":
			sincronizar({ 
				url : obj.url 
				,cha : obj.chain 
				,res: function(resp){
					self.postMessage(resp);
				}
			});
		break;
		default:
			self.postMessage(JSON.stringify({success: false, msj: 'funcion no recibida' }));
	}
	
}, false);
/*! web worker calls */

/*! SQL LITE */
var webdb = {};
webdb.db = null;
// Función para crear la base de datos
webdb.open = function(options) {
	if (typeof openDatabase == "undefined") return;
	// Opciones por defecto
   	var options = options || {};
	options.name = options.name || 'noname';
	options.mb = options.mb || 5;
	options.description = options.description || 'no description';
	options.version = options.version || '1.0';
	// Definimos el tamaño en MB
   	var dbSize = options.mb * 1024 * 1024;
	// Cargamos la base de datos
   	webdb.db = openDatabase(options.name, options.version, options.description, dbSize);
}
// ExecuteSql
webdb.executeSql = function(sql, data, onSuccess, onError){
	if (!webdb.db) return;
	webdb.db.transaction(function(tx){tx.executeSql(sql, data,onSuccess,onError);});
}
// Base de datos
var opt = {
	name: "sforza",
	mb: 2,
	description: "Base de datos local de sforza",
	version: "1.0"
};
// Abrimos la base de datos
webdb.open(opt);
/*! END SQL LITE */

//simple XHR request in pure JavaScript
function ajax(obj) {
	var xhr;
 
	if(typeof XMLHttpRequest !== 'undefined') xhr = new XMLHttpRequest();
	else {
		var versions = ["MSXML2.XmlHttp.5.0", 
			 	"MSXML2.XmlHttp.4.0",
			 	"MSXML2.XmlHttp.3.0", 
			 	"MSXML2.XmlHttp.2.0",
			 	"Microsoft.XmlHttp"]
 
		for(var i = 0, len = versions.length; i < len; i++) {
		try {
			xhr = new ActiveXObject(versions[i]);
			break;
		}
			catch(e){}
		} // end for
	}
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			if (xhr.status === 200) {
				if (obj.success) obj.success(JSON.parse(xhr.responseText));
			} else {
				var error = xhr.responseText ? JSON.parse(xhr.responseText).error : {message: 'An error has occurred'};
				if (obj.error) obj.error(error);
			}
		}
	}
	var method = obj.method || 'GET';
	//
	xhr.open(method, obj.url, true);
	xhr.responseType = 'application/json';
	xhr.crossDomain = true;
	//
	if(obj.params){
		//POST
		var str = JSON.stringify(obj.params);
		xhr.setRequestHeader("Content-type", "application/json");
		xhr.send(str);
	}else{
		xhr.send();
	}
}
function sincronizar(obj){
	var func = obj.res;
	var online = navigator.onLine;
	if(online === false){
		return false;
	}
	webdb.executeSql('SELECT ID, sync FROM actividad', [],
	function(tx, r){
		var rows = r.rows,
			items = [],
			tot = rows.length;
		for(var i=0; i<tot; i++){
			var row = rows.item(i);
			items.push(row);
		}	
		if(items.length > 0){
			ajax({
				url: obj.url+'input/verificar'
				,method: 'POST'
				,params: {chain: obj.cha, data: items}
				,success: function(r){
					if(r.success){						
						var cola = [];
						if(r.sincroniza.length > 0){
							cola.push(r.sincroniza);
						}
						if(r.subir.length > 0){
							cola.push(r.subir);
						}
						if(r.bajar.length > 0){
							cola.push(r.bajar);
						}
						if(cola.length > 0){
							subir_bajar(0, 0, cola, func, obj.url, obj.cha);
						}
					}
				}
				,error: function(error){
				//	func(JSON.stringify(error));
				}
			});
		}
	},
	function(tx, e){});
}
function subir_bajar(key_actual, key_cola, arr, func, url, chain){
	var arrgeglo = arr[key_cola];
	if(arrgeglo[key_actual] == undefined){
		if(key_cola < arr.length){
			setTimeout(function(){
				subir_bajar(0, key_cola+1, arr, func, url, chain);
			}, 200);
		}
		return false;
	}
	var id = arrgeglo[key_actual];
	if(id.length != 32){
		webdb.executeSql('SELECT * FROM actividad WHERE ID = ?', [id],
		function(tx, r){
			var rows = r.rows,
				tot = rows.length;
			for(var i=0; i<tot; i++){
				var row = rows.item(i);
				ajax({
					url: url+'input/index'
					,method : 'POST'
					,params : { 
						chain: row.chain
						,json: row.json 
						,data: row.data 
					}
					,success: function(data){
						if(data.success){
							webdb.executeSql('UPDATE actividad SET sync=? WHERE ID = ?', [data.sync, row.ID],
							function(tx, r){
								setTimeout(function(){
									subir_bajar(key_actual+1, key_cola, arr, func, url, chain);
								}, 200);
							},
							function(tx, e){});
						}
					}
				});
			}
		},
		function(tx, e){});
	}else{
		//puede ser subir o bajar para saberlo hay que buscarlo en local
		//si existe hay que subirlo y si no existe hay que bajarlo
		webdb.executeSql('SELECT * FROM actividad WHERE chain = ? AND sync = ?', [chain, id],
		function(tx, r){
			var rows = r.rows,
				tot = rows.length;
			if(tot > 0){				
				for(var i=0; i<tot; i++){
					var row = rows.item(i);
					ajax({
						url: url+'input/index/'+id
						,method : 'POST'
						,params : { 
							chain: row.chain
							,json: row.json 
							,data: row.data 
						}
						,success: function(data){
							if(data.success){
								setTimeout(function(){
									subir_bajar(key_actual+1, key_cola, arr, func, url, chain);
								}, 200);
							}
						}
					});	
				}
			}else{
				ajax({
					url: url+'input/bajar/'+chain+'/'+id
					,method : 'GET'
					,success: function(r){
						if(r.success){
							var act = r.data,
								tot = act.length,
								fecha = act[0].ini;
								
							webdb.executeSql('INSERT INTO actividad (chain, json, sync, data) VALUES (?,?,?,?)'
							,[ chain, JSON.stringify(act), id, fecha]
							,function(tx, r){
								setTimeout(function(){
									subir_bajar(key_actual+1, key_cola, arr, func, url, chain);
								}, 200);
							}
							,function(tx, e){});
						}else{
							setTimeout(function(){
								subir_bajar(key_actual+1, key_cola, arr, func, url, chain);
							}, 200);
						}
					}
				});	
				
			}
		},
		function(tx, e){});
	}
}