// Sistema de sincronización en tiempo real con Firebase
// Versión optimizada para garantizar consistencia absoluta entre dispositivos

;(() => {
  console.log("=== INICIANDO SISTEMA DE SINCRONIZACIÓN EN TIEMPO REAL CON FIREBASE ===")

  // Variables globales
  let firebaseInicializado = false
  let sincronizacionEnProgreso = false
  let escuchaActiva = false
  let indicadorEstado
  let botonSincronizacion
  let panelDiagnostico
  let datosLocalesLimpios = false
  let ultimaSincronizacion = 0
  let unsubscribeFirestore = null
  let datosLocalesBloqueados = false

  // Import Firebase SDK (assuming it's available globally or via a module)
  // If using modules:
  // import * as firebase from 'firebase/app';
  // import 'firebase/firestore';
  // import 'firebase/database';

  // Declare firebase if it's not already declared globally
  if (typeof firebase === "undefined") {
    console.warn("Firebase is not globally defined. Ensure Firebase SDK is properly included.")
  }

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
        firstSeen: firebase.database.ServerValue.TIMESTAMP,
      })

      console.log("Dispositivo registrado correctamente")
      return true
    } catch (error) {
      console.error("Error al registrar dispositivo:", error)
      return false
    }
  }

  // Función para guardar cambios en Firebase
  async function guardarCambiosEnFirebase(datos) {
    if (sincronizacionEnProgreso || datosLocalesBloqueados) {
      console.log("Sincronización en progreso o datos bloqueados. No se pueden guardar cambios.")
      return false
    }

    if (!inicializarFirebase()) {
      mostrarNotificacion("Firebase no está disponible", "error")
      return false
    }

    sincronizacionEnProgreso = true
    actualizarIndicadorEstado("sincronizando")

    try {
      // Añadir metadatos
      const datosConMetadatos = {
        ...datos,
        _lastModified: firebase.firestore.FieldValue.serverTimestamp(),
        _lastModifiedBy: {
          deviceId: obtenerIdDispositivo(),
          username: obtenerInfoUsuario().username,
          timestamp: new Date().toISOString(),
        },
      }

      // Guardar en Firestore
      await firebase.firestore().collection("datos").doc("principal").set(datosConMetadatos)

      console.log("Datos guardados correctamente en Firebase")
      mostrarNotificacion("Datos sincronizados correctamente", "success")

      ultimaSincronizacion = Date.now()
      sincronizacionEnProgreso = false
      actualizarIndicadorEstado("conectado")
      return true
    } catch (error) {
      console.error("Error al guardar datos en Firebase:", error)
      mostrarNotificacion("Error al sincronizar: " + error.message, "error")
      sincronizacionEnProgreso = false
      actualizarIndicadorEstado("error")
      return false
    }
  }

  // Función para descargar datos de Firebase
  async function descargarDatosDeFirebase(forzar = false) {
    if (sincronizacionEnProgreso && !forzar) {
      console.log("Ya hay una sincronización en progreso, esperando...")
      return false
    }

    sincronizacionEnProgreso = true
    actualizarIndicadorEstado("sincronizando")

    // Añadir timeout para la operación
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Timeout al descargar datos de Firebase")), 10000)
    })

    if (!inicializarFirebase()) {
      sincronizacionEnProgreso = false
      actualizarIndicadorEstado("error")
      return false
    }

    console.log("Descargando datos desde Firebase...")

    try {
      // Usar Promise.race para implementar timeout
      const docSnap = await Promise.race([
        firebase.firestore().collection("datos").doc("principal").get(),
        timeoutPromise,
      ])

      if (docSnap.exists) {
        const datosFirebase = docSnap.data()

        // Eliminar metadatos antes de guardar localmente
        const { _lastModified, _lastModifiedBy, ...datosLimpios } = datosFirebase

        // Bloquear datos locales durante la actualización
        datosLocalesBloqueados = true

        // IMPORTANTE: Guardar en localStorage SIEMPRE
        localStorage.setItem("tiendaCelulares", JSON.stringify(datosLimpios))
        localStorage.setItem("lastSyncTimestamp", Date.now().toString())

        mostrarNotificacion("Datos actualizados desde Firebase", "success")
        datosLocalesLimpios = true

        ultimaSincronizacion = Date.now()
        sincronizacionEnProgreso = false
        actualizarIndicadorEstado("conectado")

        // Actualizar la UI
        actualizarUI()

        // Desbloquear datos locales
        setTimeout(() => {
          datosLocalesBloqueados = false
        }, 500)

        return true
      } else {
        console.log("No hay datos en Firebase, subiendo datos locales iniciales...")
        sincronizacionEnProgreso = false

        // Solo si no hay datos en Firebase, subir los datos locales como iniciales
        const datosLocales = JSON.parse(localStorage.getItem("tiendaCelulares") || "{}")
        if (Object.keys(datosLocales).length > 0) {
          return guardarCambiosEnFirebase(datosLocales)
        } else {
          console.log("No hay datos locales ni en Firebase. Esperando datos nuevos.")
          return true
        }
      }
    } catch (error) {
      console.error("Error al descargar datos de Firebase:", error)
      mostrarNotificacion("Error al descargar datos: " + error.message, "error")
      sincronizacionEnProgreso = false
      actualizarIndicadorEstado("error")
      datosLocalesBloqueados = false
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
      descargarDatosDeFirebase(true)
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
      <button id="btn-descargar" style="flex: 1; padding: 8px; background-color: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">Forzar Sincronización</button>
      <button id="btn-limpiar" style="flex: 1; padding: 8px; background-color: #fd7e14; color: white; border: none; border-radius: 3px; cursor: pointer;">Limpiar Local</button>
      <button id="btn-cerrar" style="flex: 1; padding: 8px; background-color: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">Cerrar</button>
    </div>
  `

    document.body.appendChild(panelDiagnostico)

    // Añadir eventos a los botones
    document.getElementById("btn-descargar").addEventListener("click", () => {
      descargarDatosDeFirebase(true)
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
        descargarDatosDeFirebase(true)
      }, 500)
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
      <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${obtenerIdDispositivo() ? "#4CAF50" : "#FFC107"}; margin-right: 5px;"></span>
      <span>Dispositivo: ${obtenerIdDispositivo() ? "Registrado" : "No registrado"}</span>
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

      // Cancelar suscripción anterior si existe
      if (unsubscribeFirestore) {
        unsubscribeFirestore()
        unsubscribeFirestore = null
      }

      // Escuchar cambios en el documento principal con opciones optimizadas
      unsubscribeFirestore = firebase
        .firestore()
        .collection("datos")
        .doc("principal")
        .onSnapshot(
          {
            includeMetadataChanges: false, // Solo cambios de datos, no metadatos
          },
          (doc) => {
            if (doc.exists) {
              const datosFirebase = doc.data()

              // Verificar si el cambio fue hecho por este dispositivo
              if (
                datosFirebase._lastModifiedBy &&
                datosFirebase._lastModifiedBy.deviceId === obtenerIdDispositivo() &&
                Date.now() - new Date(datosFirebase._lastModifiedBy.timestamp).getTime() < 10000 // Solo ignorar cambios recientes (10 segundos)
              ) {
                console.log("Cambio detectado, pero fue hecho por este dispositivo recientemente. Ignorando.")
                return
              }

              console.log("Cambio detectado en Firebase. Actualizando datos locales inmediatamente...")

              // Bloquear datos locales durante la actualización
              datosLocalesBloqueados = true

              // Eliminar metadatos antes de guardar localmente
              const { _lastModified, _lastModifiedBy, ...datosLimpios } = datosFirebase

              // IMPORTANTE: Guardar en localStorage SIEMPRE
              localStorage.setItem("tiendaCelulares", JSON.stringify(datosLimpios))
              localStorage.setItem("lastSyncTimestamp", Date.now().toString())

              // Actualizar la UI inmediatamente
              actualizarUI()

              // Mostrar notificación
              mostrarNotificacion("Datos actualizados en tiempo real", "success")

              // Actualizar estado
              datosLocalesLimpios = true
              ultimaSincronizacion = Date.now()
              actualizarIndicadorEstado("conectado")

              // Desbloquear datos locales después de un breve retraso
              setTimeout(() => {
                datosLocalesBloqueados = false
              }, 500)
            }
          },
          (error) => {
            console.error("Error en escucha en tiempo real:", error)
            mostrarNotificacion("Error en sincronización en tiempo real", "error")

            // Reintentar la conexión después de un retraso
            setTimeout(() => {
              configurarEscuchaEnTiempoReal()
            }, 5000)
          },
        )

      escuchaActiva = true
      console.log("Escucha en tiempo real configurada correctamente")
    } catch (error) {
      console.error("Error al configurar escucha en tiempo real:", error)
      mostrarNotificacion("Error al configurar sincronización en tiempo real", "error")
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

      // Si los datos están bloqueados, no permitir guardar
      if (datosLocalesBloqueados) {
        console.warn("Datos bloqueados durante sincronización. Operación ignorada.")
        return
      }

      // Llamar a la función original primero
      window.guardarEnLocalStorageOriginal.apply(this, arguments)

      // Obtener los datos actuales y sincronizar inmediatamente
      try {
        const datos = JSON.parse(localStorage.getItem("tiendaCelulares") || "{}")

        // Sincronizar con Firebase inmediatamente
        guardarCambiosEnFirebase(datos)
      } catch (error) {
        console.error("Error al procesar datos para sincronización:", error)
      }
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

          // SIEMPRE descargar datos al conectarse
          descargarDatosDeFirebase(true)
        } else {
          console.log("Desconectado de Firebase")
          actualizarIndicadorEstado("desconectado")
        }
      })
    }
  }

  // Función para mostrar bloqueo de UI durante sincronización inicial
  function mostrarBloqueoUI(mensaje) {
    // Verificar si ya existe un overlay y eliminarlo
    ocultarBloqueoUI()

    // Crear overlay de bloqueo
    const overlay = document.createElement("div")
    overlay.id = "firebase-sync-overlay"
    overlay.style.position = "fixed"
    overlay.style.top = "0"
    overlay.style.left = "0"
    overlay.style.width = "100%"
    overlay.style.height = "100%"
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.7)"
    overlay.style.display = "flex"
    overlay.style.justifyContent = "center"
    overlay.style.alignItems = "center"
    overlay.style.zIndex = "10000"
    overlay.style.flexDirection = "column"

    // Crear spinner
    const spinner = document.createElement("div")
    spinner.style.border = "5px solid #f3f3f3"
    spinner.style.borderTop = "5px solid #3498db"
    spinner.style.borderRadius = "50%"
    spinner.style.width = "50px"
    spinner.style.height = "50px"
    spinner.style.animation = "spin 2s linear infinite"

    // Crear keyframes para animación
    const style = document.createElement("style")
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `
    document.head.appendChild(style)

    // Crear mensaje
    const mensajeElement = document.createElement("div")
    mensajeElement.textContent = mensaje
    mensajeElement.style.color = "white"
    mensajeElement.style.marginTop = "20px"
    mensajeElement.style.fontFamily = "Arial, sans-serif"

    // Crear botón de cancelar
    const botonCancelar = document.createElement("button")
    botonCancelar.textContent = "Continuar sin sincronizar"
    botonCancelar.style.marginTop = "20px"
    botonCancelar.style.padding = "8px 16px"
    botonCancelar.style.backgroundColor = "#f44336"
    botonCancelar.style.color = "white"
    botonCancelar.style.border = "none"
    botonCancelar.style.borderRadius = "4px"
    botonCancelar.style.cursor = "pointer"
    botonCancelar.addEventListener("click", () => {
      ocultarBloqueoUI()
      mostrarNotificacion("Sincronización cancelada. Usando datos locales.", "warning")
    })

    // Añadir elementos al DOM
    overlay.appendChild(spinner)
    overlay.appendChild(mensajeElement)
    overlay.appendChild(botonCancelar)
    document.body.appendChild(overlay)
  }

  // Función para ocultar bloqueo de UI
  function ocultarBloqueoUI() {
    try {
      const overlay = document.getElementById("firebase-sync-overlay")
      if (overlay && overlay.parentNode) {
        document.body.removeChild(overlay)
      }
    } catch (error) {
      console.error("Error al ocultar bloqueo UI:", error)
      // Forzar eliminación del overlay si existe
      const overlays = document.querySelectorAll("#firebase-sync-overlay")
      overlays.forEach((overlay) => {
        try {
          if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay)
          }
        } catch (e) {
          console.error("Error al forzar eliminación del overlay:", e)
        }
      })
    }
  }

  // Inicializar todo el sistema
  async function inicializarSistema() {
    console.log("Inicializando sistema de sincronización en tiempo real con Firebase...")

    // Mostrar bloqueo de UI durante la inicialización
    mostrarBloqueoUI("Sincronizando con Firebase...")

    // Timeout de seguridad para quitar el bloqueo después de 15 segundos
    const timeoutSeguridad = setTimeout(() => {
      console.warn("Timeout de seguridad activado. Quitando bloqueo de UI...")
      ocultarBloqueoUI()
      mostrarNotificacion(
        "La sincronización está tardando más de lo esperado, pero puedes seguir usando la aplicación",
        "warning",
      )
    }, 15000)

    try {
      // Inicializar Firebase
      inicializarFirebase()

      // Crear elementos de UI
      crearIndicadorEstado()
      crearBotonSincronizacion()
      crearPanelDiagnostico()

      // Registrar dispositivo
      await registrarDispositivo()

      // IMPORTANTE: Descargar datos de Firebase ANTES de cualquier otra operación
      const descargaExitosa = await descargarDatosDeFirebase(true)

      if (!descargaExitosa) {
        console.warn("No se pudieron descargar datos de Firebase. Continuando con datos locales...")
        mostrarNotificacion("No se pudieron descargar datos de Firebase. Usando datos locales.", "warning")
      } else {
        console.log("Datos iniciales descargados correctamente")
      }

      // Configurar escucha en tiempo real DESPUÉS de la descarga inicial
      configurarEscuchaEnTiempoReal()

      // Monitorear conexión
      monitorearConexion()

      // Interceptar guardarEnLocalStorage DESPUÉS de haber descargado datos
      interceptarGuardarEnLocalStorage()

      console.log("Sistema de sincronización inicializado correctamente")
    } catch (error) {
      console.error("Error al inicializar sistema:", error)
      mostrarNotificacion(
        "Error al inicializar sistema de sincronización. La aplicación funcionará con datos locales.",
        "error",
      )
    } finally {
      // Limpiar timeout de seguridad
      clearTimeout(timeoutSeguridad)

      // Ocultar bloqueo de UI
      ocultarBloqueoUI()

      // Asegurar que la UI se actualice con los datos disponibles
      setTimeout(() => {
        actualizarUI()
      }, 500)
    }
  }

  // Iniciar cuando el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializarSistema)
  } else {
    inicializarSistema()
  }

  // Exponer funciones útiles globalmente
  window.sincronizarConFirebase = descargarDatosDeFirebase
  window.subirDatosAFirebase = guardarCambiosEnFirebase
  window.descargarDatosDeFirebase = descargarDatosDeFirebase
  window.limpiarDatosLocales = limpiarDatosLocales
})()


