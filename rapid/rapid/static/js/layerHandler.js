var layers = {};
var add = true;

var replaceAll = function (str, find, replace) {
  return str.replace(new RegExp(find, 'g'), replace);
}

var defaultParameters = {
    service: 'WFS',
    version: '1.1.0',
    request: 'GetFeature',
    // layer name goes below, prefixed by 'rapid:'. All layer names are lowercase
    // and spaces are replaced with _
    // ex: Minnesota Railroads would be minnesota_railroads
    typeName: '',
    maxFeatures: 200,
    outputFormat: 'text/javascript',
    // CQL_FILTER: ''
};

var parameters = L.Util.extend(defaultParameters);

function handleJson(data, uid) {

    layers[uid] = L.geoJson(data, {
                            onEachFeature: constructPopup
                            }).addTo(map);

    map.fitBounds(layers[uid]);
}

function parseResponse() {
    console.log("Data received")
}

function addLayerToMap(uid)
{
    var button = $(document.getElementById(uid.data + "_show"));

    if (add == true) {
        if (layers[uid.data]) {
            map.addLayer(layers[uid.data]);
        }
        else {
            defaultParameters.typeName = 'rapid:' + uid.data;

            console.log(Request.TO_GEOSERVER + L.Util.getParamString(parameters));

            $.ajax({
                url: Request.TO_GEOSERVER + L.Util.getParamString(parameters),
                dataType: 'jsonp',
                headers: {
                    // IMPORTANT: Need to use https to hide user credentials
                    'Authorization': 'Basic ' + btoa('admin:admin')
                },
                jsonpCallback: 'parseResponse',
                success: function(data) {
                    handleJson(data, uid.data);
                }
            });
        }

        button.text('Remove');
    }
    else {
        map.removeLayer(layers[uid.data]);

        button.text('Preview');
    }

    add = !add;
}

var refreshLayers = function () {
	try {
			var oReq = new XMLHttpRequest();
			oReq.open("GET", Request.TO_GEOSERVER_LAYERS);
			oReq.send();

			oReq.onreadystatechange = function() {
				if (oReq.readyState == 4 && oReq.status == 200) {                
					//console.log(oReq.responseText);
					var existingLayers = JSON.parse(oReq.responseText);
					$('#layerList').html('<li><h4>Available Layers</h4></li>');

					for (i = 0; i < existingLayers.length; i++) {
                     //    var att;
					    var uid = existingLayers[i].uid;
					    // layers[uid] = existingLayers[i];
                        var liDiv = $(document.createElement('div'));
                        var buttonDiv = $(document.createElement('div')).addClass('dropdown').css({'display': 'inline-block', 'float': 'right'});
						var button = $(document.createElement('button'));
						    button.attr('type', 'button');
						    button.attr('id', uid + '_add');
                            button.attr('data-toggle', 'dropdown');
                            button.attr('aria-haspopup', 'true');
                            button.attr('aria-expanded', 'false');
                            button.css('float', 'right');
                            button.addClass('btn btn-default btn-xs dropdown-toggle');
                            button.text('Add ');

                            buttonDiv.append(button.append($(document.createElement('span')).addClass('caret')));

                        var dropdownUL = $(document.createElement('ul')).addClass('dropdown-menu');
                            dropdownUL.attr('aria-labelledby', uid + '_add');
                            dropdownUL.css({'right': 0, 'left': 'inherit'});

                        var dropdownLI = $(document.createElement('li')).addClass('dropdown-header').text('GeoViews');
                            dropdownUL.append(dropdownLI);

                        for (var geoView in geoViews) {
                            dropdownLI = $(document.createElement('li'));
                            var dropdownA = $(document.createElement('a')).text('- ' + geoViews[geoView].descriptor).attr('href', '#');
                            dropdownA.attr ('onClick', 'addLayerToGeoView(\'' + uid +'\', \'' + geoViews[geoView].uid +'\')');
                            dropdownUL.append(dropdownLI.append(dropdownA));
                        }

                        var li = $(document.createElement('li'));

						var public = existingLayers[i].is_public == false ? '(private) ' : '(public) ';

						var descriptor = document.createTextNode(existingLayers[i].title + " " + public);
                        var addToMapDiv = $(document.createElement('div')).addClass('dropdown').css({'display': 'inline-block', 'float': 'right'});
                        var addToMapButton = $(document.createElement('button'));
                            addToMapButton.attr('type','button');
                            addToMapButton.attr('id', uid + '_show');
                            addToMapButton.css('float', 'right');
                            addToMapButton.addClass('btn btn-default btn-xs dropdown-toggle');
                            addToMapButton.text('Preview');
                            addToMapButton.click(uid, addLayerToMap);

                        addToMapDiv.append(addToMapButton.append($(document.createElement('span'))));
					// 	var uid = existingLayers[i].uid;
						liDiv.attr('id', uid + '_layer');
                        liDiv.css({'width': '100%', 'display': 'inline-block', 'margin-bottom': '5px'});
						li.append(liDiv);
						liDiv.append(descriptor).append(addToMapDiv).append(buttonDiv.append(dropdownUL));
						$('#layerList').append(li);
					}
                    $('#layerList').append(document.createElement('li')).append(document.createElement('hr'));
				}

    		}
		}
		catch(err) {
			alert("There was an error!");
			messageDiv.innerHTML = err.message;
		}
}

function getGeoViewInput(l_uid) {
    var div = document.getElementById(l_uid + '_layer');
    var form = document.createElement('FORM'); form.id = l_uid + '_form';
    var selector = document.createElement('SELECT');
    selector.style.float = 'right'; selector.id = l_uid + '_selector';
    selector.onfocus = function () {
         document.getElementById(l_uid + '_add').disabled = false;
         document.getElementById(l_uid + '_add').onclick = function () {
             addLayerToGeoView(l_uid, selector.value);
             return false;
         }
         return false;
     }
    for (var geoView in geoViews) {
        var option = document.createElement('OPTION');
        var optionText = document.createTextNode(geoViews[geoView].descriptor);
        option.value = geoViews[geoView].uid;
        selector.appendChild(option).appendChild(optionText);
    }
    form.appendChild(selector);
    div.appendChild(form);
}

function addLayerToGeoView (l_uid, gv_uid) {
    // console.log(l_uid + ' ' + gv_uid);
    // var form = document.getElementById(l_uid + '_form');
    // var liDiv = document.getElementById(l_uid + '_layer');
    // liDiv.removeChild(form);

    try {
    var oReq = new XMLHttpRequest();
        oReq.open("GET", Request.TO_GEOVIEW + 'addlayer/' + gv_uid + '/' + l_uid + '/?token=' + localStorage.getItem('token'));
        oReq.send();

        oReq.onreadystatechange = function() {
            if (oReq.readyState == 4 && oReq.status == 200) {
                messageDiv.innerHTML = (JSON.parse(oReq.responseText).status);
                var button = $('#' + l_uid + '_add');
                button.click(function () {
                    // console.log('disable button');
                    // getGeoViewInput(l_uid);
                    button.addClass('disabled');
                    return false;
                });
                ajaxCall(Request.TO_GEOVIEW+'?token='+localStorage.getItem('token'), function (response) {
                    getGeoviews(response, true)});
            }
        }
    }
    catch(err) {
			alert('There was an error!');
			messageDiv.innerHTML = err.message;
   }

}

function sendDataLayer (des, public, props) {

    var layer = {
        "des": "",
        "public": "",
        "props": { }
    }

    layer.des = des; layer.public = public; layer.props = props;

    try {
    var oReq = new XMLHttpRequest();
        oReq.open("POST", Request.TO_LAYER + '?token=' + localStorage.getItem('token'));
        oReq.send(JSON.stringify(layer));

        oReq.onreadystatechange = function() {
            if (oReq.readyState == 4 && oReq.status == 200) {
                messageDiv.innerHTML = (JSON.parse(oReq.responseText).status);
                refreshLayers();
            }
        }
    }
    catch(err) {
			alert("There was an error!");
			messageDiv.innerHTML = err.message;
   }


} 