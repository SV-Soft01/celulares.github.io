// Sistema de sincronización específico para usuarios/login
// Archivo independiente que solo maneja la sincronización de usuarios

;(() => {
    console.log("Inicializando sincronización de usuarios...")
  
    // Variables globales
    var sincronizacionEnProgreso = false
    var firebase = window.firebase // Asegurarse de que firebase esté disponible globalmente
  
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
  
    // Función para sincronizar usuarios
    function sincronizarUsuarios() {
      if (sincronizacionEnProgreso) {
        console.log("Ya hay una sincronización en progreso, esperando...")
        return Promise.resolve(false)
      }
  
      if (!verificarFirestore()) {
        console.error("Firestore no está disponible para sincronización de usuarios")
        mostrarNotificacion("Firestore no está disponible", "error")
        return Promise.resolve(false)
      }
  
      sincronizacionEnProgreso = true
      console.log("Sincronizando usuarios...")
  
      try {
        // Intentar obtener usuarios del localStorage
        var usuarios = localStorage.getItem("usuarios")
  
        if (!usuarios) {
          console.log("No hay usuarios locales para sincronizar")
          sincronizacionEnProgreso = false
          return cargarUsuariosDesdeFirebase()
        }
  
        usuarios = JSON.parse(usuarios)
  
        // Guardar en Firestore
        return firebase
          .firestore()
          .collection("sistema")
          .doc("usuarios")
          .set({
            usuarios: usuarios,
            _lastModified: firebase.firestore.FieldValue.serverTimestamp(),
            _lastModifiedBy: {
              deviceId: obtenerIdDispositivo(),
              username: obtenerInfoUsuario().username,
              timestamp: new Date().toISOString(),
            },
          })
          .then(() => {
            console.log("Usuarios sincronizados correctamente")
            mostrarNotificacion("Usuarios sincronizados correctamente", "success")
            sincronizacionEnProgreso = false
            return true
          })
          .catch((error) => {
            console.error("Error al sincronizar usuarios:", error)
            mostrarNotificacion("Error al sincronizar usuarios: " + error.message, "error")
            sincronizacionEnProgreso = false
            return false
          })
      } catch (error) {
        console.error("Error al preparar usuarios para sincronización:", error)
        mostrarNotificacion("Error al preparar usuarios: " + error.message, "error")
        sincronizacionEnProgreso = false
        return Promise.resolve(false)
      }
    }
  
    // Función para cargar usuarios desde Firebase
    function cargarUsuariosDesdeFirebase() {
      if (sincronizacionEnProgreso) {
        console.log("Ya hay una sincronización en progreso, esperando...")
        return Promise.resolve(false)
      }
  
      if (!verificarFirestore()) {
        console.error("Firestore no está disponible para carga de usuarios")
        mostrarNotificacion("Firestore no está disponible", "error")
        return Promise.resolve(false)
      }
  
      sincronizacionEnProgreso = true
      console.log("Cargando usuarios desde Firebase...")
  
      try {
        return firebase
          .firestore()
          .collection("sistema")
          .doc("usuarios")
          .get()
          .then((doc) => {
            if (doc.exists && doc.data().usuarios) {
              var usuariosFirebase = doc.data().usuarios
  
              // Guardar en localStorage
              localStorage.setItem("usuarios", JSON.stringify(usuariosFirebase))
              console.log("Usuarios cargados desde Firebase")
              mostrarNotificacion("Usuarios cargados desde Firebase", "success")
              sincronizacionEnProgreso = false
              return true
            } else {
              console.log("No hay usuarios en Firebase")
              mostrarNotificacion("No hay usuarios en Firebase", "info")
              sincronizacionEnProgreso = false
              return false
            }
          })
          .catch((error) => {
            console.error("Error al cargar usuarios desde Firebase:", error)
            mostrarNotificacion("Error al cargar usuarios: " + error.message, "error")
            sincronizacionEnProgreso = false
            return false
          })
      } catch (error) {
        console.error("Error al cargar usuarios:", error)
        mostrarNotificacion("Error al cargar usuarios: " + error.message, "error")
        sincronizacionEnProgreso = false
        return Promise.resolve(false)
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
  
    // Interceptar funciones de manejo de usuarios
    function interceptarFuncionesUsuarios() {
      // Interceptar función de login si existe
      if (typeof window.iniciarSesion === "function" && !window.iniciarSesionOriginal) {
        window.iniciarSesionOriginal = window.iniciarSesion
        window.iniciarSesion = function () {
          var resultado = window.iniciarSesionOriginal.apply(this, arguments)
          // Después de iniciar sesión, sincronizar usuarios
          setTimeout(() => {
            sincronizarUsuarios()
          }, 1000)
          return resultado
        }
        console.log("Función iniciarSesion interceptada")
      }
  
      // Interceptar función de registro si existe
      if (typeof window.registrarUsuario === "function" && !window.registrarUsuarioOriginal) {
        window.registrarUsuarioOriginal = window.registrarUsuario
        window.registrarUsuario = function () {
          var resultado = window.registrarUsuarioOriginal.apply(this, arguments)
          // Después de registrar usuario, sincronizar usuarios
          setTimeout(() => {
            sincronizarUsuarios()
          }, 1000)
          return resultado
        }
        console.log("Función registrarUsuario interceptada")
      }
  
      // Interceptar función de guardar usuarios si existe
      if (typeof window.guardarUsuarios === "function" && !window.guardarUsuariosOriginal) {
        window.guardarUsuariosOriginal = window.guardarUsuarios
        window.guardarUsuarios = function () {
          var resultado = window.guardarUsuariosOriginal.apply(this, arguments)
          // Después de guardar usuarios, sincronizar
          setTimeout(() => {
            sincronizarUsuarios()
          }, 1000)
          return resultado
        }
        console.log("Función guardarUsuarios interceptada")
      }
  
      // Interceptar función de agregar administrador si existe
      if (typeof window.agregarAdministrador === "function" && !window.agregarAdministradorOriginal) {
        window.agregarAdministradorOriginal = window.agregarAdministrador
        window.agregarAdministrador = function () {
          var resultado = window.agregarAdministradorOriginal.apply(this, arguments)
          // Después de agregar administrador, sincronizar usuarios
          setTimeout(() => {
            sincronizarUsuarios()
          }, 1000)
          return resultado
        }
        console.log("Función agregarAdministrador interceptada")
      }
  
      // Interceptar función de agregar cajero si existe
      if (typeof window.agregarCajero === "function" && !window.agregarCajeroOriginal) {
        window.agregarCajeroOriginal = window.agregarCajero
        window.agregarCajero = function () {
          var resultado = window.agregarCajeroOriginal.apply(this, arguments)
          // Después de agregar cajero, sincronizar usuarios
          setTimeout(() => {
            sincronizarUsuarios()
          }, 1000)
          return resultado
        }
        console.log("Función agregarCajero interceptada")
      }
  
      // Interceptar función de agregar taller si existe
      if (typeof window.agregarTaller === "function" && !window.agregarTallerOriginal) {
        window.agregarTallerOriginal = window.agregarTaller
        window.agregarTaller = function () {
          var resultado = window.agregarTallerOriginal.apply(this, arguments)
          // Después de agregar taller, sincronizar usuarios
          setTimeout(() => {
            sincronizarUsuarios()
          }, 1000)
          return resultado
        }
        console.log("Función agregarTaller interceptada")
      }
    }
  
    // Crear botón de sincronización de usuarios
    function crearBotonSincronizacion() {
      var boton = document.createElement("button")
      boton.innerHTML = "👤"
      boton.style.position = "fixed"
      boton.style.bottom = "10px"
      boton.style.left = "10px"
      boton.style.width = "30px"
      boton.style.height = "30px"
      boton.style.borderRadius = "50%"
      boton.style.backgroundColor = "#28a745"
      boton.style.color = "white"
      boton.style.border = "none"
      boton.style.fontSize = "16px"
      boton.style.cursor = "pointer"
      boton.style.zIndex = "9999"
      boton.style.display = "flex"
      boton.style.justifyContent = "center"
      boton.style.alignItems = "center"
      boton.title = "Sincronizar usuarios"
  
      boton.addEventListener("click", () => {
        sincronizarUsuarios()
      })
  
      document.body.appendChild(boton)
    }
  
    // Inicializar
    function inicializar() {
      console.log("Inicializando sistema de sincronización de usuarios...")
  
      // Interceptar funciones de usuarios
      interceptarFuncionesUsuarios()
  
      // Crear botón de sincronización
      crearBotonSincronizacion()
  
      // Cargar usuarios iniciales desde Firebase
      setTimeout(() => {
        cargarUsuariosDesdeFirebase()
      }, 1000)
  
      console.log("Sistema de sincronización de usuarios inicializado correctamente")
    }
  
    // Iniciar cuando el DOM esté listo
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", inicializar)
    } else {
      inicializar()
    }
  
    // Exponer funciones globalmente
    window.sincronizarUsuarios = sincronizarUsuarios
    window.cargarUsuariosDesdeFirebase = cargarUsuariosDesdeFirebase
  })()
  
  