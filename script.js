// Datos de clientes
const clientes = [
    { 
        "nombre": "Wichy Alonzo", 
        "telefono": "1234567890", 
        "direccion": "5 de Mayo #48, Uriangato, Guanajuato", 
        "tipoCliente" : "A*", 
        "ciudad": "Uriangato", 
        "estado": "Guanajuato"
    },
    { 
        "nombre": "Pedro Martinez", 
        "telefono": "0987654321", 
        "direccion": "Aztecas 138, Uriangato, Guanajuato",         
        "tipoCliente" : "A*", 
        "ciudad": "Uriangato", 
        "estado": "Guanajuato"
    },
    { 
        "nombre": "Pedro Martinez", 
        "telefono": "0987654321", 
        "direccion": "Juan de La Barrera 240, Cortazar, Gto.",         
        "tipoCliente" : "A*", 
        "ciudad": "Uriangato", 
        "estado": "Guanajuato"
    }
];

// Inicializar el mapa centrado en Uriangato, Guanajuato
var map = L.map('map').setView([20.1426, -101.1846], 13);

// Añadir capa de mapa
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Variables para mantener los marcadores y las coordenadas
let markers = [];
let coordinates = [];
let userCircle;
let userRouteControl;
let initialRouteControl;
let userLocation;

// Función para convertir direcciones a coordenadas y añadir marcadores con popups
function addMarkers(clientes) {
    const promises = clientes.map(cliente => {
        // Codificar la dirección para la URL
        const direccionCodificada = encodeURIComponent(cliente.direccion);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${direccionCodificada}&accept-language=es`;

        // Convertir dirección a coordenadas usando la API de Nominatim
        return fetch(url)
            .then(response => response.json())
            .then(locations => {
                if (locations.length > 0) {
                    var location = locations[0];
                    console.log('Coordenadas encontradas para:', cliente.direccion, location);

                    var popupContent = `
                        <b>${cliente.nombre}</b><br>
                        <b>Teléfono:</b> ${cliente.telefono}<br>
                        <b>Dirección:</b> ${cliente.direccion}<br>
                        <b>Tipo de Cliente:</b> ${cliente.tipoCliente}<br>
                        <b>Ciudad:</b> ${cliente.ciudad}<br>
                        <b>Estado:</b> ${cliente.estado}
                    `;

                    var marker = L.marker([location.lat, location.lon]).addTo(map);
                    marker.bindPopup(popupContent);
                    markers.push(marker);  // Guardar el marcador
                    coordinates.push(L.latLng(location.lat, location.lon));  // Guardar las coordenadas

                    return { lat: location.lat, lon: location.lon };
                } else {
                    console.error(`No se encontraron coordenadas para la dirección: ${cliente.direccion}`);
                    return null;
                }
            })
            .catch(error => {
                console.error(`Error al buscar la dirección ${cliente.direccion}:`, error);
                return null;
            });
    });

    return Promise.all(promises).then(() => {
        // Trazar la ruta inicial entre los puntos de los clientes
        if (coordinates.length > 1) {
            initialRouteControl = L.Routing.control({
                waypoints: coordinates,
                createMarker: function() { return null; },  // No crear marcadores adicionales
                routeWhileDragging: true
            }).addTo(map);
        }
    });
}

// Función para obtener la ubicación en tiempo real del usuario
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                resolve(userLocation);
            }, error => {
                reject(error);
            });
        } else {
            reject(new Error("Geolocation no es soportado por este navegador."));
        }
    });
}

// Función para encontrar el punto más cercano
function findClosestPoint(userLocation, points) {
    let minDistance = Infinity;
    let closestPoint = null;

    points.forEach(point => {
        const distance = map.distance(userLocation, point);
        if (distance < minDistance) {
            minDistance = distance;
            closestPoint = point;
        }
    });

    return closestPoint;
}

// Función para actualizar la ubicación del usuario y la ruta
async function updateUserLocation() {
    try {
        const newUserLocation = await getUserLocation();
        const userLatLng = L.latLng(newUserLocation.lat, newUserLocation.lon);

        // Actualizar la posición del círculo del usuario
        if (userCircle) {
            userCircle.setLatLng(userLatLng);
        } else {
            userCircle = L.circle(userLatLng, {
                color: 'blue',
                fillColor: '#30f',
                fillOpacity: 0.5,
                radius: 10
            }).addTo(map);
            // Centrar el mapa en la primera actualización
            map.setView(userLatLng, map.getZoom());
        }

        // Encontrar el punto más cercano a la ubicación del usuario
        const closestPoint = findClosestPoint(userLatLng, coordinates);

        if (closestPoint) {
            // Actualizar la ruta desde la ubicación del usuario al punto más cercano
            if (userRouteControl) {
                userRouteControl.setWaypoints([userLatLng, closestPoint]);
            } else {
                userRouteControl = L.Routing.control({
                    waypoints: [userLatLng, closestPoint],
                    createMarker: function() { return null; },  // No crear marcadores adicionales
                    routeWhileDragging: true
                }).addTo(map);
            }
        }
    } catch (error) {
        console.error("Error al actualizar la ubicación del usuario:", error);
    }
}

// Iniciar la aplicación
async function init() {
    try {
        // Añadir los marcadores de los clientes y trazar la ruta entre ellos
        await addMarkers(clientes);

        // Obtener la ubicación del usuario y actualizarla cada 5 segundos
        await updateUserLocation();
        setInterval(updateUserLocation, 5000);
    } catch (error) {
        console.error("Error:", error);
    }
}

init();
