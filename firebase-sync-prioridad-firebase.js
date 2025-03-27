// Sistema de sincronización con Firebase - Versión con prioridad a datos remotos
// Garantiza que los datos de Firebase siempre tengan prioridad sobre los locales

;(() => {
    console.log("=== INICIANDO SISTEMA DE SINCRONIZACIÓN CON PRIORIDAD A FIREBASE ===")
  
    // Variables globales
    let firebaseInicializado = false
    let sincronizacionEnProgreso = false
    let ultimaSincronizacion = 0
    let dispositivoRegistrado = false
    let escuchaActiva = false
    let indicadorEstado
    let botonSincronizacion
    let panelDiagnostico
    let datosLocalesLimpios = false
  
    // Configuración de Firebase
    const firebaseConfig = {
      apiKey: "AIzaSyDz8D2vus826XLPgQ6P7vV_bZ16umkwjYo",
      authDomain: "tienda-de-celulares-a72c8.firebaseapp.com",
      projectId: "tienda-de-celulares-a72c8",
      storageBucket: "tienda-de-celulares-a72c8.firebasestorage.app",
      messagingSenderId: "710353154355",
      appId: "1:710353154355:web:a6e64a5ff3cab9f6b10e46",
      measurementId: "G-HQ70MX9BL4",
      databaseURL: "https://tienda-de-celulares-a72c8-default-rtdb.firebaseio.com",
    }
  
    // Verificar si Firebase está disponible
    function verificarFirebase() {
      try {
        return typeof firebase !== "undefined" && firebase.apps && firebase.apps.length > 0
      } catch (e) {
        console.error("Error al verificar Firebase:", e)
        return false
      }
    }
  
    // Inicializar Firebase
    function inicializarFirebase() {
      if (firebaseInicializado) return true
  
      try {
        // Verificar si ya está inicializado
        if (verificarFirebase()) {
          console.log("Firebase ya está inicializado")
          firebaseInicializado = true
          return true
        }
  
        // Inicializar Firebase
        if (typeof firebase === "undefined") {
          console.error("Firebase SDK no encontrado. Asegúrate de incluirlo en tu HTML.")
          mostrarNotificacion("Firebase SDK no encontrado. Por favor inclúyelo.", "error")
          return false
        }
  
        firebase.initializeApp(firebaseConfig)
        console.log("Firebase inicializado correctamente")
        firebaseInicializado = true
  
        // Configurar persistencia para Firestore
        if (firebase.firestore) {
          firebase
            .firestore()
            .enablePersistence({ synchronizeTabs: true })
            .then(() => {
              console.log("Persistencia de Firestore habilitada")
            })
            .catch((err) => {
              if (err.code == "failed-precondition") {
                console.warn("La persistencia de Firestore no pudo habilitarse porque hay múltiples pestañas abiertas")
              } else if (err.code == "unimplemented") {
                console.warn("El navegador actual no soporta persistencia de Firestore")
              }
            })
        }
  
        return true
      } catch (error) {
        console.error("Error al inicializar Firebase:", error)
        mostrarNotificacion("Error al inicializar Firebase: " + error.message, "error")
        return false
      }
    }
  
    // Función para obtener o generar ID de dispositivo
    function obtenerIdDispositivo() {
      let deviceId = localStorage.getItem("device_id")
      if (!deviceId) {
        deviceId = "device_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9)
        localStorage.setItem("device_id", deviceId)
        console.log("Nuevo ID de dispositivo generado:", deviceId)
        dispositivoRegistrado = false
      } else {
        dispositivoRegistrado = true
      }
      return deviceId
    }
  
    // Función para obtener información del usuario actual
    function obtenerInfoUsuario() {
      try {
        return sessionStorage.getItem("currentUser")
          ? JSON.parse(sessionStorage.getItem("currentUser"))
          : { username: "unknown" }
      } catch (e) {
        console.error("Error al obtener información del usuario:", e)
        return { username: "unknown" }
      }
    }
  
    // Función para registrar dispositivo en Firebase
    async function registrarDispositivo() {
      if (!inicializarFirebase()) return false
  
      const deviceId = obtenerIdDispositivo()
  
      try {
        // Registrar en Realtime Database para presencia
        const deviceStatusRef = firebase.database().ref(`devices/${deviceId}/status`)
        const deviceInfoRef = firebase.database().ref(`devices/${deviceId}/info`)
  
        // Cuando nos desconectemos, actualizar el estado
        deviceStatusRef.onDisconnect().set("offline")
  
        // Actualizar estado a online
        await deviceStatusRef.set("online")
  
        // Guardar información del dispositivo
        await deviceInfoRef.set({
          lastSeen: firebase.database.ServerValue.TIMESTAMP,
          userAgent: navigator.userAgent,
          username: obtenerInfoUsuario().username,
          firstSeen: dispositivoRegistrado ? undefined : firebase.database.ServerValue.TIMESTAMP,
        })
  
        console.log("Dispositivo registrado correctamente")
        return true
      } catch (error) {
        console.error("Error al registrar dispositivo:", error)
        return false
      }
    }
  
    // Función para subir datos a Firebase
    async function subirDatosAFirebase() {
      if (sincronizacionEnProgreso) {
        console.log("Ya hay una sincronización en progreso, esperando...")
        return false
      }
  
      sincronizacionEnProgreso = true
      actualizarIndicadorEstado("sincronizando")
  
      if (!inicializarFirebase()) {
        sincronizacionEnProgreso = false
        actualizarIndicadorEstado("error")
        return false
      }
  
      console.log("Subiendo datos a Firebase...")
  
      try {
        // Obtener datos locales
        const datosLocales = JSON.parse(localStorage.getItem("tiendaCelulares") || "{}")
  
        // Añadir metadatos
        const datosConMetadatos = {
          ...datosLocales,
          _lastModified: firebase.firestore.FieldValue.serverTimestamp(),
          _lastModifiedBy: {
            deviceId: obtenerIdDispositivo(),
            username: obtenerInfoUsuario().username,
            timestamp: new Date().toISOString(),
          },
        }
  
        // Guardar en Firestore
        await firebase.firestore().collection("datos").doc("principal").set(datosConMetadatos)
  
        console.log("Datos subidos correctamente a Firebase")
        mostrarNotificacion("Datos sincronizados correctamente", "success")
        ultimaSincronizacion = Date.now()
        sincronizacionEnProgreso = false
        actualizarIndicadorEstado("conectado")
        return true
      } catch (error) {
        console.error("Error al subir datos a Firebase:", error)
        mostrarNotificacion("Error al sincronizar: " + error.message, "error")
        sincronizacionEnProgreso = false
        actualizarIndicadorEstado("error")
        return false
      }
    }
  
    // Función para descargar datos de Firebase (siempre completa)
    async function descargarDatosDeFirebase() {
      if (sincronizacionEnProgreso) {
        console.log("Ya hay una sincronización en progreso, esperando...")
        return false
      }
  
      sincronizacionEnProgreso = true
      actualizarIndicadorEstado("sincronizando")
  
      if (!inicializarFirebase()) {
        sincronizacionEnProgreso = false
        actualizarIndicadorEstado("error")
        return false
      }
  
      console.log("Descargando datos desde Firebase...")
  
      try {
        const docSnap = await firebase.firestore().collection("datos").doc("principal").get()
  
        if (docSnap.exists) {
          const datosFirebase = docSnap.data()
  
          // Eliminar metadatos antes de guardar localmente
          const { _lastModified, _lastModifiedBy, ...datosLimpios } = datosFirebase
  
          // Guardar en localStorage
          localStorage.setItem("tiendaCelulares", JSON.stringify(datosLimpios))
          localStorage.setItem("lastSyncTimestamp", Date.now().toString())
  
          mostrarNotificacion("Datos descargados de Firebase", "success")
          datosLocalesLimpios = true
  
          ultimaSincronizacion = Date.now()
          sincronizacionEnProgreso = false
          actualizarIndicadorEstado("conectado")
  
          // Actualizar la UI
          actualizarUI()
  
          return true
        } else {
          console.log("No hay datos en Firebase, subiendo datos locales...")
          sincronizacionEnProgreso = false
          return subirDatosAFirebase()
        }
      } catch (error) {
        console.error("Error al descargar datos de Firebase:", error)
        mostrarNotificacion("Error al descargar datos: " + error.message, "error")
        sincronizacionEnProgreso = false
        actualizarIndicadorEstado("error")
        return false
      }
    }
  
    // Función para actualizar la UI
    function actualizarUI() {
      console.log("Actualizando UI...")
  
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
      const notificacion = document.createElement("div")
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
  
    // Función para crear indicador de estado
    function crearIndicadorEstado() {
      indicadorEstado = document.createElement("div")
      indicadorEstado.style.position = "fixed"
      indicadorEstado.style.bottom = "10px"
      indicadorEstado.style.right = "10px"
      indicadorEstado.style.width = "15px"
      indicadorEstado.style.height = "15px"
      indicadorEstado.style.borderRadius = "50%"
      indicadorEstado.style.backgroundColor = "#FFC107" // Amarillo por defecto
      indicadorEstado.style.boxShadow = "0 0 5px rgba(0,0,0,0.3)"
      indicadorEstado.style.zIndex = "9999"
      indicadorEstado.style.cursor = "pointer"
      indicadorEstado.title = "Estado de Firebase: Verificando..."
  
      indicadorEstado.addEventListener("click", () => {
        if (panelDiagnostico) {
          panelDiagnostico.style.display = panelDiagnostico.style.display === "none" ? "block" : "none"
        }
      })
  
      document.body.appendChild(indicadorEstado)
    }
  
    // Función para actualizar indicador de estado
    function actualizarIndicadorEstado(estado) {
      if (!indicadorEstado) return
  
      switch (estado) {
        case "conectado":
          indicadorEstado.style.backgroundColor = "#4CAF50" // Verde
          indicadorEstado.title = "Estado de Firebase: Conectado"
          break
        case "desconectado":
          indicadorEstado.style.backgroundColor = "#F44336" // Rojo
          indicadorEstado.title = "Estado de Firebase: Desconectado"
          break
        case "sincronizando":
          indicadorEstado.style.backgroundColor = "#2196F3" // Azul
          indicadorEstado.title = "Estado de Firebase: Sincronizando..."
          break
        case "error":
          indicadorEstado.style.backgroundColor = "#FF9800" // Naranja
          indicadorEstado.title = "Estado de Firebase: Error de sincronización"
          break
        default:
          indicadorEstado.style.backgroundColor = "#FFC107" // Amarillo
          indicadorEstado.title = "Estado de Firebase: Verificando..."
      }
    }
  
    // Función para crear botón de sincronización
    function crearBotonSincronizacion() {
      botonSincronizacion = document.createElement("button")
      botonSincronizacion.innerHTML = "↻"
      botonSincronizacion.style.position = "fixed"
      botonSincronizacion.style.bottom = "40px"
      botonSincronizacion.style.right = "10px"
      botonSincronizacion.style.width = "40px"
      botonSincronizacion.style.height = "40px"
      botonSincronizacion.style.borderRadius = "50%"
      botonSincronizacion.style.backgroundColor = "#4a6da7"
      botonSincronizacion.style.color = "white"
      botonSincronizacion.style.border = "none"
      botonSincronizacion.style.fontSize = "20px"
      botonSincronizacion.style.cursor = "pointer"
      botonSincronizacion.style.zIndex = "9999"
      botonSincronizacion.title = "Sincronizar manualmente con Firebase"
  
      botonSincronizacion.addEventListener("click", () => {
        descargarDatosDeFirebase()
      })
  
      document.body.appendChild(botonSincronizacion)
    }
  
    // Función para crear panel de diagnóstico
    function crearPanelDiagnostico() {
      panelDiagnostico = document.createElement("div")
      panelDiagnostico.style.position = "fixed"
      panelDiagnostico.style.bottom = "70px"
      panelDiagnostico.style.right = "20px"
      panelDiagnostico.style.backgroundColor = "#f8f9fa"
      panelDiagnostico.style.border = "1px solid #dee2e6"
      panelDiagnostico.style.borderRadius = "5px"
      panelDiagnostico.style.padding = "15px"
      panelDiagnostico.style.zIndex = "9999"
      panelDiagnostico.style.boxShadow = "0 0 10px rgba(0,0,0,0.1)"
      panelDiagnostico.style.maxWidth = "350px"
      panelDiagnostico.style.display = "none" // Oculto por defecto
  
      panelDiagnostico.innerHTML = `
        <h4 style="margin-top: 0; margin-bottom: 15px; color: #333;">Diagnóstico Firebase</h4>
        <div id="firebase-status" style="margin-bottom: 10px;">
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: #FFC107; margin-right: 5px;"></span>
          <span>Firebase: Verificando...</span>
        </div>
        <div id="dispositivo-status" style="margin-bottom: 10px;">
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: #FFC107; margin-right: 5px;"></span>
          <span>Dispositivo: Verificando...</span>
        </div>
        <div id="datos-status" style="margin-bottom: 10px;">
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: #FFC107; margin-right: 5px;"></span>
          <span>Datos locales: Verificando...</span>
        </div>
        <div id="ultima-sincronizacion" style="margin-bottom: 15px;">
          Última sincronización: Nunca
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 5px;">
          <button id="btn-descargar" style="flex: 1; padding: 8px; background-color: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">Descargar Datos</button>
          <button id="btn-limpiar" style="flex: 1; padding: 8px; background-color: #fd7e14; color: white; border: none; border-radius: 3px; cursor: pointer;">Limpiar Local</button>
          <button id="btn-cerrar" style="flex: 1; padding: 8px; background-color: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">Cerrar</button>
        </div>
      `
  
      document.body.appendChild(panelDiagnostico)
  
      // Añadir eventos a los botones
      document.getElementById("btn-descargar").addEventListener("click", () => {
        descargarDatosDeFirebase()
      })
  
      document.getElementById("btn-limpiar").addEventListener("click", () => {
        limpiarDatosLocales()
      })
  
      document.getElementById("btn-cerrar").addEventListener("click", () => {
        panelDiagnostico.style.display = "none"
      })
    }
  
    // Función para limpiar datos locales
    function limpiarDatosLocales() {
      try {
        localStorage.removeItem("tiendaCelulares")
        localStorage.removeItem("lastSyncTimestamp")
        datosLocalesLimpios = false
        mostrarNotificacion("Datos locales eliminados. Descargando datos de Firebase...", "success")
        setTimeout(() => {
          descargarDatosDeFirebase()
        }, 1000)
      } catch (error) {
        console.error("Error al limpiar datos locales:", error)
        mostrarNotificacion("Error al limpiar datos locales", "error")
      }
    }
  
    // Función para actualizar panel de diagnóstico
    function actualizarEstadoDiagnostico() {
      if (!panelDiagnostico) return
  
      const firebaseDisponible = verificarFirebase()
  
      // Actualizar estado de Firebase
      const firebaseStatus = document.getElementById("firebase-status")
      if (firebaseStatus) {
        firebaseStatus.innerHTML = `
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${firebaseDisponible ? "#4CAF50" : "#F44336"}; margin-right: 5px;"></span>
          <span>Firebase: ${firebaseDisponible ? "Disponible" : "No disponible"}</span>
        `
      }
  
      // Actualizar estado del dispositivo
      const dispositivoStatus = document.getElementById("dispositivo-status")
      if (dispositivoStatus) {
        dispositivoStatus.innerHTML = `
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${dispositivoRegistrado ? "#4CAF50" : "#FFC107"}; margin-right: 5px;"></span>
          <span>Dispositivo: ${dispositivoRegistrado ? "Registrado" : "Nuevo"}</span>
        `
      }
  
      // Actualizar estado de datos locales
      const datosStatus = document.getElementById("datos-status")
      if (datosStatus) {
        datosStatus.innerHTML = `
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${datosLocalesLimpios ? "#4CAF50" : "#FFC107"}; margin-right: 5px;"></span>
          <span>Datos locales: ${datosLocalesLimpios ? "Sincronizados" : "Pendientes"}</span>
        `
      }
  
      // Actualizar última sincronización
      const ultimaSincronizacionElement = document.getElementById("ultima-sincronizacion")
      if (ultimaSincronizacionElement) {
        ultimaSincronizacionElement.textContent =
          "Última sincronización: " +
          (ultimaSincronizacion > 0 ? new Date(ultimaSincronizacion).toLocaleString() : "Nunca")
      }
    }
  
    // Configurar escucha en tiempo real
    function configurarEscuchaEnTiempoReal() {
      if (!inicializarFirebase() || escuchaActiva) return
  
      try {
        console.log("Configurando escucha en tiempo real...")
  
        // Escuchar cambios en el documento principal
        firebase
          .firestore()
          .collection("datos")
          .doc("principal")
          .onSnapshot(
            (doc) => {
              if (doc.exists) {
                const datosFirebase = doc.data()
  
                // Verificar si el cambio fue hecho por este dispositivo
                if (datosFirebase._lastModifiedBy && datosFirebase._lastModifiedBy.deviceId === obtenerIdDispositivo()) {
                  console.log("Cambio detectado, pero fue hecho por este dispositivo. Ignorando.")
                  return
                }
  
                console.log("Cambio detectado en Firebase. Actualizando datos locales...")
                descargarDatosDeFirebase()
              }
            },
            (error) => {
              console.error("Error en escucha en tiempo real:", error)
            },
          )
  
        escuchaActiva = true
        console.log("Escucha en tiempo real configurada correctamente")
      } catch (error) {
        console.error("Error al configurar escucha en tiempo real:", error)
      }
    }
  
    // Interceptar guardarEnLocalStorage
    function interceptarGuardarEnLocalStorage() {
      console.log("Configurando intercepción de guardarEnLocalStorage...")
  
      // Guardar la función original
      const guardarOriginal = window.guardarEnLocalStorage
  
      // Si la función original no existe, crear una función vacía
      if (typeof guardarOriginal !== "function") {
        console.warn("La función guardarEnLocalStorage no existe. Creando una función vacía.")
        window.guardarEnLocalStorageOriginal = () => {
          console.warn("Función guardarEnLocalStorage original no encontrada")
        }
      } else {
        window.guardarEnLocalStorageOriginal = guardarOriginal
      }
  
      // Reemplazar con nuestra versión que sincroniza con Firebase
      window.guardarEnLocalStorage = function () {
        console.log("Interceptando guardarEnLocalStorage...")
  
        // Llamar a la función original primero
        window.guardarEnLocalStorageOriginal.apply(this, arguments)
  
        // Sincronizar con Firebase con un pequeño retraso
        clearTimeout(window._syncTimeout)
        window._syncTimeout = setTimeout(() => {
          subirDatosAFirebase()
        }, 1000)
      }
  
      console.log("Intercepción de guardarEnLocalStorage configurada correctamente")
    }
  
    // Monitorear estado de conexión
    function monitorearConexion() {
      if (!inicializarFirebase()) return
  
      if (firebase.database) {
        const connectedRef = firebase.database().ref(".info/connected")
        connectedRef.on("value", (snap) => {
          if (snap.val() === true) {
            console.log("Conectado a Firebase")
            actualizarIndicadorEstado("conectado")
  
            // Siempre descargar datos al conectarse
            setTimeout(() => {
              descargarDatosDeFirebase()
            }, 2000)
          } else {
            console.log("Desconectado de Firebase")
            actualizarIndicadorEstado("desconectado")
          }
        })
      }
    }
  
    // Inicializar todo el sistema
    async function inicializarSistema() {
      console.log("Inicializando sistema de sincronización con prioridad a Firebase...")
  
      // Inicializar Firebase
      inicializarFirebase()
  
      // Crear elementos de UI
      crearIndicadorEstado()
      crearBotonSincronizacion()
      crearPanelDiagnostico()
  
      // Interceptar guardarEnLocalStorage
      interceptarGuardarEnLocalStorage()
  
      // Monitorear conexión
      monitorearConexion()
  
      // Registrar dispositivo
      await registrarDispositivo()
  
      // Configurar escucha en tiempo real
      configurarEscuchaEnTiempoReal()
  
      // Siempre descargar datos al inicio para asegurar que tenemos los datos más recientes
      setTimeout(() => {
        descargarDatosDeFirebase()
      }, 1000)
  
      console.log("Sistema de sincronización inicializado correctamente")
    }
  
    // Iniciar cuando el DOM esté listo
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", inicializarSistema)
    } else {
      inicializarSistema()
    }
  
    // Exponer funciones útiles globalmente
    window.sincronizarConFirebase = descargarDatosDeFirebase
    window.subirDatosAFirebase = subirDatosAFirebase
    window.descargarDatosDeFirebase = descargarDatosDeFirebase
    window.limpiarDatosLocales = limpiarDatosLocales
  })()
  
  