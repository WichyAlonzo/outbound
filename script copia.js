// Datos de clientes
const clientes = [
    { 
        "nombre": "Wichy Alonzo", 
        "telefono": "1234567890", 
        "direccion": "Tierra y libertad 3, Uriangato, Guanajuato", 
        "tipoCliente" : "A*", 
        "ciudad": "Uriangato", 
        "estado": "Guanajuato"
    },
    { 
        "nombre": "Pedro Martinez", 
        "telefono": "0987654321", 
        "direccion": "Aztecas 138, uriangato, guanajuato",         
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
                        Teléfono: ${cliente.telefono}<br>
                        Dirección: ${cliente.direccion}<br>
                        Tipo de Cliente: ${cliente.tipoCliente}<br>
                        Ciudad: ${cliente.ciudad}<br>
                        Estado: ${cliente.estado}
                    `;

                    var marker = L.marker([location.lat, location.lon]).addTo(map);
                    marker.bindPopup(popupContent);

                    // Añadir eventos para mostrar el popup al hacer hover o click
                    marker.on('click', function() {
                        marker.openPopup();
                    });

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

    return Promise.all(promises).then(destinations => {
        console.log('Destinations:', destinations);
        return destinations.filter(destination => destination !== null);
    });
}

// Función para trazar y actualizar la ruta
let routeControl;

function updateRoute(currentLocation, destinations) {
    var waypoints = [L.latLng(currentLocation.lat, currentLocation.lon)];
    destinations.forEach(destination => {
        waypoints.push(L.latLng(destination.lat, destination.lon));
    });

    if (routeControl) {
        routeControl.setWaypoints(waypoints);
    } else {
        routeControl = L.Routing.control({
            waypoints: waypoints,
            routeWhileDragging: true
        }).addTo(map);
    }
}

// Obtener la ubicación en tiempo real del usuario
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const currentLocation = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                resolve(currentLocation);
            }, error => {
                reject(error);
            });
        } else {
            reject(new Error("Geolocation no es soportado por este navegador."));
        }
    });
}

// Actualizar la ubicación del usuario a intervalos regulares
let userCircle;
function updateUserLocation(destinations) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const currentLocation = {
                lat: position.coords.latitude,
                lon: position.coords.longitude
            };
            map.setView([currentLocation.lat, currentLocation.lon], 13);

            if (userCircle) {
                map.removeLayer(userCircle);
            }

            userCircle = L.circle([currentLocation.lat, currentLocation.lon], {
                color: 'blue',
                fillColor: '#30f',
                fillOpacity: 0.5,
                radius: 10
            }).addTo(map);

            updateRoute(currentLocation, destinations);
        }, error => {
            console.error("Error al obtener la ubicación del usuario:", error);
        });
    } else {
        console.error("Geolocation no es soportado por este navegador.");
    }
}

// Iniciar la aplicación
async function init() {
    try {
        const currentLocation = await getUserLocation();
        map.setView([currentLocation.lat, currentLocation.lon], 13);
        const destinations = await addMarkers(clientes);
        updateRoute(currentLocation, destinations);

        // Actualizar la ubicación del usuario cada 10 segundos
        setInterval(() => {
            updateUserLocation(destinations);
        }, 10000);
    } catch (error) {
        console.error("Error al obtener la ubicación del usuario:", error);
    }
}

init();
