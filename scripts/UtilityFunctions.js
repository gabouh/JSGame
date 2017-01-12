/**
 * Created by polakja15 on 12.01.2017.
 */
function loadFileContent (url) {
    var request = new XMLHttpRequest();
    request.open("GET", url, false);
    request.send();
    return request.responseText;
}