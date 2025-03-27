// Sistema de sincronización optimizado con Firebase - Versión 2
// Implementa sincronización incremental con panel de diagnóstico mejorado

;(() => {
    console.log("Inicializando sincronización Firebase optimizada v2...")
  
    // Variables globales
    var sincronizacionEnProgreso = false
    var ultimaSincronizacion = 0
    var cambiosPendientes = {}
    var datosVersiones = {}
    var panelVisible = false
  
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
  
    // Función para calcular hash simple de un objeto
    function calcularHash(obj) {
      return JSON.stringify(obj)
        .split("")
        .reduce((a, b) => {
          a = (a << 5) - a + b.charCodeAt(0)
          return a & a
        }, 0)
        .toString(16)
    }
  
    // Función para detectar cambios en los datos
    function detectarCambios() {
      try {
        // Obtener datos actuales
        var datos = JSON.parse(localStorage.getItem("tiendaCelulares") || "{}")
        var cambios = {}
        var hayNuevosCambios = false
  
        // Verificar cada sección de datos
        for (var seccion in datos) {
          if (Array.isArray(datos[seccion])) {
            // Para arrays (inventario, facturas, etc.)
            var hashActual = calcularHash(datos[seccion])
  
            if (!datosVersiones[seccion] || datosVersiones[seccion] !== hashActual) {
              cambios[seccion] = datos[seccion]
              datosVersiones[seccion] = hashActual
              hayNuevosCambios = true
            }
          } else if (typeof datos[seccion] === "object" && datos[seccion] !== null) {
            // Para objetos (capital, etc.)
            var hashActualObj = calcularHash(datos[seccion])
  
            if (!datosVersiones[seccion] || datosVersiones[seccion] !== hashActualObj) {
              cambios[seccion] = datos[seccion]
              datosVersiones[seccion] = hashActualObj
              hayNuevosCambios = true
            }
          } else {
            // Para valores simples (ganancias, etc.)
            if (!datosVersiones[seccion] || datosVersiones[seccion] !== datos[seccion]) {
              cambios[seccion] = datos[seccion]
              datosVersiones[seccion] = datos[seccion]
              hayNuevosCambios = true
            }
          }
        }
  
        if (hayNuevosCambios) {
          cambiosPendientes = Object.assign({}, cambiosPendientes, cambios)
          return true
        }
  
        return false
      } catch (e) {
        console.error("Error al detectar cambios:", e)
        return false
      }
    }
  
    // Función para guardar cambios en Firebase
    function guardarCambiosEnFirebase() {
      if (sincronizacionEnProgreso) {
        console.log("Ya hay una sincronización en progreso, esperando...")
        return Promise.resolve(false)
      }
  
      if (!verificarFirestore()) {
        console.error("Firestore no está disponible para sincronización")
        mostrarNotificacion("Firestore no está disponible", "error")
        return Promise.resolve(false)
      }
  
      if (Object.keys(cambiosPendientes).length === 0) {
        console.log("No hay cambios pendientes para sincronizar")
        return Promise.resolve(false)
      }
  
      sincronizacionEnProgreso = true
      console.log("Guardando cambios en Firebase...")
      actualizarEstadoDiagnostico("sincronizando")
  
      try {
        // Añadir metadatos
        var cambiosConMetadatos = Object.assign({}, cambiosPendientes, {
          _lastModified: firebase.firestore.FieldValue.serverTimestamp(),
          _lastModifiedBy: {
            deviceId: obtenerIdDispositivo(),
            username: obtenerInfoUsuario().username,
            timestamp: new Date().toISOString(),
          },
        })
  
        // Guardar en Firestore usando actualización parcial
        return firebase
          .firestore()
          .collection("datos")
          .doc("principal")
          .set(cambiosConMetadatos, { merge: true })
          .then(() => {
            console.log("Cambios guardados correctamente en Firebase:", Object.keys(cambiosPendientes))
            mostrarNotificacion("Datos sincronizados correctamente", "success")
  
            // Limpiar cambios pendientes
            cambiosPendientes = {}
            ultimaSincronizacion = Date.now()
  
            sincronizacionEnProgreso = false
            actualizarEstadoDiagnostico("conectado")
            return true
          })
          .catch((error) => {
            console.error("Error al guardar cambios en Firebase:", error)
            mostrarNotificacion("Error al sincronizar: " + error.message, "error")
            sincronizacionEnProgreso = false
            actualizarEstadoDiagnostico("error")
            return false
          })
      } catch (error) {
        console.error("Error al preparar cambios para Firebase:", error)
        mostrarNotificacion("Error al preparar datos: " + error.message, "error")
        sincronizacionEnProgreso = false
        actualizarEstadoDiagnostico("error")
        return Promise.resolve(false)
      }
    }
  
    // Función para cargar datos desde Firebase
    function cargarDatosDesdeFirebase(soloNuevos) {
      if (sincronizacionEnProgreso) {
        console.log("Ya hay una sincronización en progreso, esperando...")
        return Promise.resolve(false)
      }
  
      if (!verificarFirestore()) {
        console.error("Firestore no está disponible para carga")
        mostrarNotificacion("Firestore no está disponible", "error")
        return Promise.resolve(false)
      }
  
      sincronizacionEnProgreso = true
      console.log("Cargando datos desde Firebase...")
      actualizarEstadoDiagnostico("sincronizando")
  
      try {
        return firebase
          .firestore()
          .collection("datos")
          .doc("principal")
          .get()
          .then((doc) => {
            if (doc.exists) {
              var datosFirebase = doc.data()
              var datosActuales = JSON.parse(localStorage.getItem("tiendaCelulares") || "{}")
              var datosActualizados = Object.assign({}, datosActuales)
              var hayActualizaciones = false
  
              // Procesar cada sección de datos
              for (var seccion in datosFirebase) {
                // Ignorar metadatos
                if (seccion.startsWith("_")) continue
  
                // Si solo queremos nuevos datos y ya tenemos esta sección, verificar si hay cambios
                if (soloNuevos && datosActuales[seccion]) {
                  var hashLocal = calcularHash(datosActuales[seccion])
                  var hashRemoto = calcularHash(datosFirebase[seccion])
  
                  if (hashLocal !== hashRemoto) {
                    datosActualizados[seccion] = datosFirebase[seccion]
                    datosVersiones[seccion] = hashRemoto
                    hayActualizaciones = true
                    console.log("Actualización en sección:", seccion)
                  }
                } else {
                  // Si no tenemos esta sección o queremos todos los datos
                  datosActualizados[seccion] = datosFirebase[seccion]
                  if (datosFirebase[seccion]) {
                    datosVersiones[seccion] = calcularHash(datosFirebase[seccion])
                  }
                  hayActualizaciones = true
                  console.log("Nueva sección o actualización completa:", seccion)
                }
              }
  
              if (hayActualizaciones) {
                // Guardar datos actualizados en localStorage
                localStorage.setItem("tiendaCelulares", JSON.stringify(datosActualizados))
                console.log("Datos actualizados desde Firebase")
                mostrarNotificacion("Datos actualizados desde Firebase", "success")
  
                // Actualizar UI
                actualizarUI()
              } else {
                console.log("No hay nuevos datos para actualizar")
                mostrarNotificacion("No hay nuevos datos", "info")
              }
  
              ultimaSincronizacion = Date.now()
            } else {
              console.log("No hay datos en Firebase")
              mostrarNotificacion("No hay datos en Firebase", "info")
            }
  
            sincronizacionEnProgreso = false
            actualizarEstadoDiagnostico("conectado")
            return true
          })
          .catch((error) => {
            console.error("Error al cargar desde Firebase:", error)
            mostrarNotificacion("Error al cargar datos: " + error.message, "error")
            sincronizacionEnProgreso = false
            actualizarEstadoDiagnostico("error")
            return false
          })
      } catch (error) {
        console.error("Error al cargar desde Firebase:", error)
        mostrarNotificacion("Error al cargar datos: " + error.message, "error")
        sincronizacionEnProgreso = false
        actualizarEstadoDiagnostico("error")
        return Promise.resolve(false)
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
  
        // Detectar cambios y sincronizar si es necesario
        if (detectarCambios()) {
          // Sincronizar con Firebase con un pequeño retraso
          clearTimeout(window._syncTimeout)
          window._syncTimeout = setTimeout(() => {
            guardarCambiosEnFirebase()
          }, 500)
        }
      }
  
      console.log("Intercepción de guardarEnLocalStorage configurada correctamente")
      actualizarEstadoDiagnostico("conectado")
    }
  
    // Crear panel de diagnóstico (ahora oculto por defecto)
    function crearPanelDiagnostico() {
      // Verificar si ya existe
      if (document.getElementById("diagnostico-firebase")) {
        return
      }
  
      // Crear panel
      var panel = document.createElement("div")
      panel.id = "diagnostico-firebase"
      panel.style.position = "fixed"
      panel.style.right = "20px"
      panel.style.top = "20px"
      panel.style.width = "300px"
      panel.style.backgroundColor = "#f8f9fa"
      panel.style.border = "1px solid #dee2e6"
      panel.style.borderRadius = "5px"
      panel.style.padding = "15px"
      panel.style.boxShadow = "0 0 10px rgba(0,0,0,0.1)"
      panel.style.zIndex = "9999"
      panel.style.display = "none" // Oculto por defecto
  
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
        <div style="display: flex; gap: 5px; margin-bottom: 10px;">
          <button id="btn-sincronizar" style="flex: 1; padding: 8px; background-color: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">Sincronizar Ahora</button>
          <button id="btn-reiniciar" style="flex: 1; padding: 8px; background-color: #fd7e14; color: white; border: none; border-radius: 3px; cursor: pointer;">Reiniciar</button>
        </div>
        <div style="display: flex; gap: 5px;">
          <button id="btn-cerrar" style="flex: 1; padding: 8px; background-color: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">Cerrar</button>
        </div>
      `
  
      document.body.appendChild(panel)
  
      // Añadir eventos a los botones
      document.getElementById("btn-sincronizar").addEventListener("click", () => {
        detectarCambios()
        guardarCambiosEnFirebase().then(() => {
          cargarDatosDesdeFirebase(true)
        })
      })
  
      document.getElementById("btn-reiniciar").addEventListener("click", () => {
        reiniciarSincronizacion()
      })
  
      document.getElementById("btn-cerrar").addEventListener("click", () => {
        togglePanelDiagnostico()
      })
  
      // Actualizar estado inicial
      actualizarEstadoDiagnostico()
    }
  
    // Función para mostrar/ocultar el panel de diagnóstico
    function togglePanelDiagnostico() {
      var panel = document.getElementById("diagnostico-firebase")
      if (!panel) return
  
      panelVisible = !panelVisible
      panel.style.display = panelVisible ? "block" : "none"
    }
  
    // Actualizar estado del diagnóstico
    function actualizarEstadoDiagnostico(estado) {
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
  
      // Si se proporciona un estado específico, actualizar el indicador visual
      if (estado) {
        var indicador = document.getElementById("indicador-estado")
        if (indicador) {
          switch (estado) {
            case "conectado":
              indicador.style.backgroundColor = "#4CAF50"
              indicador.title = "Conectado a Firebase"
              break
            case "desconectado":
              indicador.style.backgroundColor = "#F44336"
              indicador.title = "Desconectado de Firebase"
              break
            case "sincronizando":
              indicador.style.backgroundColor = "#2196F3"
              indicador.title = "Sincronizando con Firebase..."
              break
            case "error":
              indicador.style.backgroundColor = "#FF9800"
              indicador.title = "Error de sincronización"
              break
            default:
              indicador.style.backgroundColor = "#FFC107"
              indicador.title = "Estado desconocido"
          }
        }
      }
    }
  
    // Crear indicador de estado y botón para mostrar panel
    function crearIndicadorEstado() {
      // Crear indicador de estado
      var indicador = document.createElement("div")
      indicador.id = "indicador-estado"
      indicador.style.position = "fixed"
      indicador.style.bottom = "10px"
      indicador.style.right = "10px"
      indicador.style.width = "15px"
      indicador.style.height = "15px"
      indicador.style.borderRadius = "50%"
      indicador.style.backgroundColor = "#FFC107"
      indicador.style.boxShadow = "0 0 5px rgba(0,0,0,0.3)"
      indicador.style.zIndex = "9999"
      indicador.style.cursor = "pointer"
      indicador.title = "Estado de Firebase: Verificando..."
  
      // Crear botón para mostrar panel
      var botonPanel = document.createElement("button")
      botonPanel.innerHTML = "⚙️"
      botonPanel.style.position = "fixed"
      botonPanel.style.bottom = "10px"
      botonPanel.style.right = "30px"
      botonPanel.style.width = "30px"
      botonPanel.style.height = "30px"
      botonPanel.style.borderRadius = "50%"
      botonPanel.style.backgroundColor = "#6c757d"
      botonPanel.style.color = "white"
      botonPanel.style.border = "none"
      botonPanel.style.fontSize = "16px"
      botonPanel.style.cursor = "pointer"
      botonPanel.style.zIndex = "9999"
      botonPanel.style.display = "flex"
      botonPanel.style.justifyContent = "center"
      botonPanel.style.alignItems = "center"
      botonPanel.title = "Mostrar panel de diagnóstico"
  
      // Añadir eventos
      indicador.addEventListener("click", togglePanelDiagnostico)
      botonPanel.addEventListener("click", togglePanelDiagnostico)
  
      // Añadir al DOM
      document.body.appendChild(indicador)
      document.body.appendChild(botonPanel)
    }
  
    // Reiniciar sincronización
    function reiniciarSincronizacion() {
      console.log("Reiniciando sincronización...")
  
      // Restaurar función original
      if (window.guardarEnLocalStorageOriginal) {
        window.guardarEnLocalStorage = window.guardarEnLocalStorageOriginal
        window.guardarEnLocalStorageOriginal = undefined
      }
  
      // Limpiar variables de estado
      cambiosPendientes = {}
      datosVersiones = {}
  
      // Volver a interceptar
      interceptarGuardarEnLocalStorage()
  
      // Cargar datos desde Firebase
      cargarDatosDesdeFirebase(false)
  
      mostrarNotificacion("Sincronización reiniciada", "success")
    }
  
    // Configurar escucha de cambios en tiempo real
    function configurarEscuchaEnTiempoReal() {
      if (!verificarFirestore()) {
        console.error("Firestore no está disponible para escucha en tiempo real")
        return
      }
  
      try {
        // Escuchar cambios en el documento principal
        firebase
          .firestore()
          .collection("datos")
          .doc("principal")
          .onSnapshot(
            (doc) => {
              if (doc.exists) {
                var datosFirebase = doc.data()
  
                // Verificar si el cambio fue hecho por este dispositivo
                if (datosFirebase._lastModifiedBy && datosFirebase._lastModifiedBy.deviceId === obtenerIdDispositivo()) {
                  console.log("Cambio detectado, pero fue hecho por este dispositivo. Ignorando.")
                  return
                }
  
                console.log("Cambio detectado en Firebase. Actualizando datos locales...")
                cargarDatosDesdeFirebase(true)
              }
            },
            (error) => {
              console.error("Error en escucha en tiempo real:", error)
            },
          )
  
        console.log("Escucha en tiempo real configurada")
      } catch (error) {
        console.error("Error al configurar escucha en tiempo real:", error)
      }
    }
  
    // Inicializar
    function inicializar() {
      console.log("Inicializando sistema de sincronización optimizado...")
  
      // Crear indicador de estado y botón para mostrar panel
      crearIndicadorEstado()
  
      // Crear panel de diagnóstico (oculto por defecto)
      crearPanelDiagnostico()
  
      // Interceptar guardarEnLocalStorage
      interceptarGuardarEnLocalStorage()
  
      // Configurar escucha en tiempo real
      configurarEscuchaEnTiempoReal()
  
      // Cargar datos iniciales desde Firebase
      setTimeout(() => {
        cargarDatosDesdeFirebase(false)
      }, 1000)
  
      console.log("Sistema de sincronización optimizado inicializado correctamente")
    }
  
    // Iniciar cuando el DOM esté listo
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", inicializar)
    } else {
      inicializar()
    }
  
    // Exponer funciones globalmente
    window.guardarCambiosEnFirebase = guardarCambiosEnFirebase
    window.cargarDatosDesdeFirebase = cargarDatosDesdeFirebase
    window.reiniciarSincronizacion = reiniciarSincronizacion
    window.togglePanelDiagnostico = togglePanelDiagnostico
  })()
  
  