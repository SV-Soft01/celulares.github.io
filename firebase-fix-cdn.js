// Script de sincronización con Firebase usando CDN
// Este script debe incluirse después de cargar las bibliotecas de Firebase

;(() => {
    console.log("Inicializando sincronización Firebase (versión CDN)...")
  
    // Variables globales
    var firebaseInicializado = false
    var sincronizacionEnProgreso = false
  
    // Verificar si Firebase está disponible
    function verificarFirebase() {
      try {
        return typeof firebase !== "undefined" && firebase.apps && firebase.apps.length > 0
      } catch (e) {
        console.error("Error al verificar Firebase:", e)
        return false
      }
    }
  
    // Verificar si Firestore está disponible
    function verificarFirestore() {
      try {
        return verificarFirebase() && typeof firebase.firestore === "function"
      } catch (e) {
        console.error("Error al verificar Firestore:", e)
        return false
      }
    }
  
    // Obtener ID de dispositivo
    function obtenerIdDispositivo() {
      var deviceId = localStorage.getItem("device_id")
      if (!deviceId) {
        deviceId = "device_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9)
        localStorage.setItem("device_id", deviceId)
        console.log("Nuevo ID de dispositivo generado:", deviceId)
      }
      return deviceId
    }
  
    // Función para guardar datos en Firebase
    function guardarEnFirebase() {
      if (sincronizacionEnProgreso) {
        console.log("Ya hay una sincronización en progreso, esperando...")
        return
      }
  
      if (!verificarFirestore()) {
        console.error("Firestore no está disponible para sincronización")
        mostrarNotificacion("Firestore no está disponible", "error")
        return
      }
  
      sincronizacionEnProgreso = true
      console.log("Guardando datos en Firebase...")
  
      try {
        // Obtener datos del localStorage
        var datos = JSON.parse(localStorage.getItem("tiendaCelulares") || "{}")
  
        // Añadir metadatos
        var datosConMetadatos = Object.assign({}, datos, {
          lastModified: firebase.firestore.FieldValue.serverTimestamp(),
          lastModifiedBy: {
            deviceId: obtenerIdDispositivo(),
            username: sessionStorage.getItem("currentUser")
              ? JSON.parse(sessionStorage.getItem("currentUser")).username
              : "unknown",
          },
        })
  
        // Guardar en Firestore
        firebase
          .firestore()
          .collection("datos")
          .doc("principal")
          .set(datosConMetadatos)
          .then(() => {
            console.log("Datos guardados correctamente en Firebase")
            mostrarNotificacion("Datos sincronizados correctamente", "success")
            sincronizacionEnProgreso = false
            actualizarEstadoDiagnostico()
          })
          .catch((error) => {
            console.error("Error al guardar en Firebase:", error)
            mostrarNotificacion("Error al sincronizar: " + error.message, "error")
            sincronizacionEnProgreso = false
            actualizarEstadoDiagnostico()
          })
      } catch (error) {
        console.error("Error al preparar datos para Firebase:", error)
        mostrarNotificacion("Error al preparar datos: " + error.message, "error")
        sincronizacionEnProgreso = false
        actualizarEstadoDiagnostico()
      }
    }
  
    // Función para cargar datos desde Firebase
    function cargarDesdeFirebase() {
      if (sincronizacionEnProgreso) {
        console.log("Ya hay una sincronización en progreso, esperando...")
        return
      }
  
      if (!verificarFirestore()) {
        console.error("Firestore no está disponible para carga")
        mostrarNotificacion("Firestore no está disponible", "error")
        return
      }
  
      sincronizacionEnProgreso = true
      console.log("Cargando datos desde Firebase...")
  
      try {
        firebase
          .firestore()
          .collection("datos")
          .doc("principal")
          .get()
          .then((doc) => {
            if (doc.exists) {
              var datosFirebase = doc.data()
  
              // Eliminar metadatos
              var { lastModified, lastModifiedBy, ...datosLimpios } = datosFirebase
  
              // Guardar en localStorage
              localStorage.setItem("tiendaCelulares", JSON.stringify(datosLimpios))
  
              console.log("Datos cargados correctamente desde Firebase")
              mostrarNotificacion("Datos cargados desde Firebase", "success")
  
              // Actualizar UI
              actualizarUI()
            } else {
              console.log("No hay datos en Firebase")
              mostrarNotificacion("No hay datos en Firebase", "info")
            }
  
            sincronizacionEnProgreso = false
            actualizarEstadoDiagnostico()
          })
          .catch((error) => {
            console.error("Error al cargar desde Firebase:", error)
            mostrarNotificacion("Error al cargar datos: " + error.message, "error")
            sincronizacionEnProgreso = false
            actualizarEstadoDiagnostico()
          })
      } catch (error) {
        console.error("Error al cargar desde Firebase:", error)
        mostrarNotificacion("Error al cargar datos: " + error.message, "error")
        sincronizacionEnProgreso = false
        actualizarEstadoDiagnostico()
      }
    }
  
    // Función para actualizar la UI
    function actualizarUI() {
      // Actualizar inventario
      if (typeof window.actualizarTablaInventario === "function" && document.getElementById("cuerpoTablaInventario")) {
        window.actualizarTablaInventario()
      }
  
      // Actualizar facturas
      if (typeof window.actualizarTablaFacturas === "function" && document.getElementById("cuerpoTablaFacturas")) {
        window.actualizarTablaFacturas()
      }
  
      // Actualizar cuentas por cobrar
      if (
        typeof window.actualizarTablaCuentasCobrar === "function" &&
        document.getElementById("cuerpoTablaCuentasCobrar")
      ) {
        window.actualizarTablaCuentasCobrar()
      }
  
      // Actualizar compras
      if (typeof window.actualizarTablaCompras === "function" && document.getElementById("cuerpoTablaCompras")) {
        window.actualizarTablaCompras()
      }
  
      // Actualizar cuentas por pagar
      if (
        typeof window.actualizarTablaCuentasPagar === "function" &&
        document.getElementById("cuerpoTablaCuentasPagar")
      ) {
        window.actualizarTablaCuentasPagar()
      }
  
      // Actualizar capital
      if (typeof window.actualizarCapital === "function" && document.getElementById("capitalTotal")) {
        window.actualizarCapital()
      }
  
      // Actualizar ganancias
      if (typeof window.actualizarGanancias === "function" && document.getElementById("gananciasTotal")) {
        window.actualizarGanancias()
      }
  
      // Actualizar clientes
      if (typeof window.actualizarTablaClientes === "function" && document.getElementById("cuerpoTablaClientes")) {
        window.actualizarTablaClientes()
      }
  
      // Actualizar proveedores
      if (typeof window.actualizarTablaProveedores === "function" && document.getElementById("cuerpoTablaProveedores")) {
        window.actualizarTablaProveedores()
      }
    }
  
    // Función para mostrar notificaciones
    function mostrarNotificacion(mensaje, tipo) {
      // Crear elemento de notificación
      var notificacion = document.createElement("div")
      notificacion.textContent = mensaje
      notificacion.style.position = "fixed"
      notificacion.style.top = "20px"
      notificacion.style.right = "20px"
      notificacion.style.backgroundColor = tipo === "success" ? "#4CAF50" : tipo === "error" ? "#F44336" : "#2196F3"
      notificacion.style.color = "white"
      notificacion.style.padding = "10px 15px"
      notificacion.style.borderRadius = "4px"
      notificacion.style.fontSize = "14px"
      notificacion.style.zIndex = "10000"
      notificacion.style.opacity = "0"
      notificacion.style.transition = "opacity 0.3s ease"
  
      // Añadir al DOM
      document.body.appendChild(notificacion)
  
      // Mostrar la notificación
      setTimeout(() => {
        notificacion.style.opacity = "1"
      }, 10)
  
      // Ocultar después de 3 segundos
      setTimeout(() => {
        notificacion.style.opacity = "0"
        setTimeout(() => {
          if (notificacion.parentNode) {
            document.body.removeChild(notificacion)
          }
        }, 300)
      }, 3000)
    }
  
    // Función para interceptar guardarEnLocalStorage
    function interceptarGuardarEnLocalStorage() {
      // Verificar si ya está interceptada
      if (window.guardarEnLocalStorageOriginal) {
        console.log("La función ya está interceptada")
        return
      }
  
      // Guardar la función original
      window.guardarEnLocalStorageOriginal = window.guardarEnLocalStorage
  
      // Si la función original no existe, crear una función vacía
      if (typeof window.guardarEnLocalStorageOriginal !== "function") {
        console.warn("La función guardarEnLocalStorage no existe. Creando una función vacía.")
        window.guardarEnLocalStorageOriginal = () => {
          console.warn("Función guardarEnLocalStorage original no encontrada")
        }
      }
  
      // Reemplazar con nuestra versión que sincroniza con Firebase
      window.guardarEnLocalStorage = function () {
        console.log("Interceptando guardarEnLocalStorage...")
  
        // Llamar a la función original primero
        window.guardarEnLocalStorageOriginal.apply(this, arguments)
  
        // Sincronizar con Firebase
        guardarEnFirebase()
      }
  
      console.log("Intercepción de guardarEnLocalStorage configurada correctamente")
      actualizarEstadoDiagnostico()
    }
  
    // Crear panel de diagnóstico
    function crearPanelDiagnostico() {
      // Verificar si ya existe
      if (document.getElementById("diagnostico-firebase")) {
        return
      }
  
      // Crear panel
      var panel = document.createElement("div")
      panel.id = "diagnostico-firebase"
      panel.style.position = "fixed"
      panel.style.left = "20px"
      panel.style.bottom = "20px"
      panel.style.width = "300px"
      panel.style.backgroundColor = "#f8f9fa"
      panel.style.border = "1px solid #dee2e6"
      panel.style.borderRadius = "5px"
      panel.style.padding = "15px"
      panel.style.boxShadow = "0 0 10px rgba(0,0,0,0.1)"
      panel.style.zIndex = "9999"
  
      panel.innerHTML = `
        <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 18px;">Diagnóstico Firebase</h3>
        <div id="estado-firebase" style="margin-bottom: 10px;">
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: #FFC107; margin-right: 5px;"></span>
          <span>Firebase: Verificando...</span>
        </div>
        <div id="estado-firestore" style="margin-bottom: 10px;">
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: #FFC107; margin-right: 5px;"></span>
          <span>Firestore: Verificando...</span>
        </div>
        <div id="estado-intercepcion" style="margin-bottom: 15px;">
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: #FFC107; margin-right: 5px;"></span>
          <span>Intercepción: Verificando...</span>
        </div>
        <div style="display: flex; gap: 5px;">
          <button id="btn-sincronizar" style="flex: 1; padding: 8px; background-color: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">Sincronizar Ahora</button>
          <button id="btn-reiniciar" style="flex: 1; padding: 8px; background-color: #fd7e14; color: white; border: none; border-radius: 3px; cursor: pointer;">Reiniciar</button>
          <button id="btn-cerrar" style="flex: 1; padding: 8px; background-color: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">Cerrar</button>
        </div>
      `
  
      document.body.appendChild(panel)
  
      // Añadir eventos a los botones
      document.getElementById("btn-sincronizar").addEventListener("click", () => {
        guardarEnFirebase()
      })
  
      document.getElementById("btn-reiniciar").addEventListener("click", () => {
        reiniciarSincronizacion()
      })
  
      document.getElementById("btn-cerrar").addEventListener("click", () => {
        panel.style.display = "none"
      })
  
      // Actualizar estado inicial
      actualizarEstadoDiagnostico()
    }
  
    // Actualizar estado del diagnóstico
    function actualizarEstadoDiagnostico() {
      var estadoFirebase = document.getElementById("estado-firebase")
      var estadoFirestore = document.getElementById("estado-firestore")
      var estadoIntercepcion = document.getElementById("estado-intercepcion")
  
      if (!estadoFirebase || !estadoFirestore || !estadoIntercepcion) return
  
      // Verificar Firebase
      var firebaseDisponible = verificarFirebase()
      estadoFirebase.innerHTML = `
        <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${firebaseDisponible ? "#4CAF50" : "#F44336"}; margin-right: 5px;"></span>
        <span>Firebase: ${firebaseDisponible ? "Disponible" : "No disponible"}</span>
      `
  
      // Verificar Firestore
      var firestoreDisponible = verificarFirestore()
      estadoFirestore.innerHTML = `
        <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${firestoreDisponible ? "#4CAF50" : "#F44336"}; margin-right: 5px;"></span>
        <span>Firestore: ${firestoreDisponible ? "Disponible" : "No disponible"}</span>
      `
  
      // Verificar intercepción
      var interceptado = window.guardarEnLocalStorageOriginal !== undefined
      estadoIntercepcion.innerHTML = `
        <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${interceptado ? "#4CAF50" : "#F44336"}; margin-right: 5px;"></span>
        <span>Intercepción: ${interceptado ? "Configurada" : "No configurada"}</span>
      `
    }
  
    // Reiniciar sincronización
    function reiniciarSincronizacion() {
      console.log("Reiniciando sincronización...")
  
      // Restaurar función original
      if (window.guardarEnLocalStorageOriginal) {
        window.guardarEnLocalStorage = window.guardarEnLocalStorageOriginal
        window.guardarEnLocalStorageOriginal = undefined
      }
  
      // Volver a interceptar
      interceptarGuardarEnLocalStorage()
  
      // Cargar datos desde Firebase
      cargarDesdeFirebase()
  
      mostrarNotificacion("Sincronización reiniciada", "success")
    }
  
    // Inicializar
    function inicializar() {
      console.log("Inicializando sistema de sincronización...")
  
      // Crear panel de diagnóstico
      crearPanelDiagnostico()
  
      // Interceptar guardarEnLocalStorage
      interceptarGuardarEnLocalStorage()
  
      // Cargar datos iniciales desde Firebase
      setTimeout(() => {
        cargarDesdeFirebase()
      }, 1000)
  
      console.log("Sistema de sincronización inicializado correctamente")
    }
  
    // Iniciar cuando el DOM esté listo
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", inicializar)
    } else {
      inicializar()
    }
  
    // Exponer funciones globalmente
    window.guardarEnFirebase = guardarEnFirebase
    window.cargarDesdeFirebase = cargarDesdeFirebase
    window.reiniciarSincronizacion = reiniciarSincronizacion
  })()
  
  