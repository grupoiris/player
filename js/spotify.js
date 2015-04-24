var runningInCordova = false;
var SES = window.localStorage;

var openLog = (function() {
	var loginCallback;
	var var_to_search;
    function login(url,search, callback) {
    	var_to_search = search;
    	loginCallback = callback;
		var AuthUrl = url;
		var loginWindow = window.open( AuthUrl , '_blank', 'location=no,width=640,height=480');
		
		if (runningInCordova) {
            loginWindow.addEventListener('loadstart', loginWindow_loadStartHandler);
            loginWindow.addEventListener('exit', loginWindow_exitHandler);
        }
        else{
        	console.log("else runinng cordova");
        }
        
        
         function loginWindow_loadStartHandler(event) {
            var url = event.url;
            if (url.indexOf(var_to_search) > 0 || url.indexOf("error=") > 0) {
                // When we get the access token fast, the login window (inappbrowser) is still opening with animation
                // in the Cordova app, and trying to close it while it's animating generates an exception. Wait a little...
                loginWindow.close();
                /*var timeout = 60 - (new Date().getTime() - startTime);
                setTimeout(function () {
                    loginWindow.close();
                }, timeout > 0 ? timeout : 0);*/
                oauthCallback(url);
            }
        }

        // Inappbrowser exit handler: Used when running in Cordova only
        function loginWindow_exitHandler() {
            // Handle the situation where the user closes the login window manually before completing the login process
            //deferredLogin.reject({error: 'user_cancelled', error_description: 'User cancelled login process', error_reason: "user_cancelled"});
            loginWindow.removeEventListener('loadstop', loginWindow_loadStartHandler);
            loginWindow.removeEventListener('exit', loginWindow_exitHandler);
            loginWindow = null;
            //console.log('done removing listeners');
        }
    }
	
    function api(obj) {
        var method = obj.method || 'GET',
            query = obj.query || {},
            xhr = new XMLHttpRequest(),
            url;

        url = obj.url + obj.path + '?' + toQueryString(query);
		
		if(obj.jsonp){
			jsonp(url, obj.success);
			return true;
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
        };
        xhr.open(method, url, true);
			
		if(obj.params){
			//
			var str = JSON.stringify(obj.params);
			xhr.setRequestHeader("Content-type", "application/json");
			xhr.setRequestHeader("Content-length", str.length);
			xhr.setRequestHeader("Connection", "close");
			xhr.send(str);
			
		}else{
			xhr.send();
		}
    }
	 function oauthCallback(url) {
        // Parse the OAuth data received from Facebook
        var queryString,
            obj;

        loginProcessed = true;
        if (url.indexOf(var_to_search) > 0) {
            queryString = url.substr(url.indexOf('?') + 1);
            obj = parseQueryString(queryString);
            if (loginCallback) loginCallback({status: 'success', authResponse: {token: obj['code']}});
        } else if (url.indexOf("error=") > 0) {
            queryString = url.substring(url.indexOf('?') + 1, url.indexOf('?'));
            obj = parseQueryString(queryString);
            if (loginCallback) loginCallback({status: 'not_authorized', error: obj.error});
        } else {
            if (loginCallback) loginCallback({status: 'not_authorized'});
        }
    }

	 function parseQueryString(queryString) {
        var qs = decodeURIComponent(queryString),
            obj = {},
            params = qs.split('&');
        params.forEach(function (param) {
            var splitter = param.split('=');
            obj[splitter[0]] = splitter[1];
        });
        return obj;
    }
	function jsonp(url, callback) {
		var callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
		window[callbackName] = function(data) {
			delete window[callbackName];
			document.body.removeChild(script);
			callback(data);
		};

		var script = document.createElement('script');
		script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + callbackName;
		document.body.appendChild(script);
	}
	return {
        login: login
        ,api: api
   };
}());

function AuthorizeSpotify(){
	request_url = 'https://accounts.spotify.com/authorize/?';
	client_id = 'd9654b6eec1c4d229d6773751e1a22da';
	response_type= 'code';
	redirect_uri = 'https://www.irisdev.co/siluet_app/accept.html';
	show_dialog = 'true';
	url = request_url+'client_id='+client_id+'&response_type='+response_type+'&redirect_uri='+redirect_uri+'&show_dialog='+show_dialog;
	openLog.login(url,"code=",function(response) {
        if(response.status === 'success') {
        	SES['code_spotify'] = response.authResponse.token;
        }
    });

}
