// Datos de clientes
const clientes = [
    { "nombre": "Cliente 1", "telefono": "1234567890", "direccion": "Tierra y libertad 3, Uriangato, Guanajuato" },
    { "nombre": "Cliente 2", "telefono": "0987654321", "direccion": "Otra dirección, Uriangato, Guanajuato" },
    { "nombre": "Cliente 3", "telefono": "1122334455", "direccion": "Otra dirección más, Uriangato, Guanajuato" },
    { "nombre": "Cliente 4", "telefono": "5566778899", "direccion": "Una dirección más, Uriangato, Guanajuato" }
];

// Inicializar el mapa centrado en Uriangato, Guanajuato
var map = L.map('map').setView([20.1426, -101.1846], 13);

// Añadir capa de mapa
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Función para convertir direcciones a coordenadas y añadir marcadores
function addMarkers(clientes) {
    const promises = clientes.map(cliente => {
        // Codificar la dirección para la URL
        const direccionCodificada = encodeURIComponent(cliente.direccion);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${direccionCodificada}`;

        // Convertir dirección a coordenadas usando la API de Nominatim
        return fetch(url)
            .then(response => response.json())
            .then(locations => {
                if (locations.length > 0) {
                    var location = locations[0];
                    var marker = L.marker([location.lat, location.lon]).addTo(map);
                    marker.bindPopup(`<b>${cliente.nombre}</b><br>${cliente.direccion}<br>${cliente.telefono}`);
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

    return Promise.all(promises).then(destinations => destinations.filter(destination => destination !== null));
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

// Rastrea la ubicación en tiempo real del usuario
function watchUserLocation(destinations) {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(position => {
            const currentLocation = {
                lat: position.coords.latitude,
                lon: position.coords.longitude
            };
            map.setView([currentLocation.lat, currentLocation.lon], 13);
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
        watchUserLocation(destinations);
    } catch (error) {
        console.error("Error al obtener la ubicación del usuario:", error);
    }
}

init();