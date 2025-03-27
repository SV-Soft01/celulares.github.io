// Sistema de sincronización bidireccional con Firebase - Versión mejorada
// Garantiza sincronización entre múltiples dispositivos

(() => {
    console.log("=== INICIANDO SISTEMA DE SINCRONIZACIÓN BIDIRECCIONAL MEJORADO ===")
  
    // Variables globales
    let firebaseInicializado = false
    let sincronizacionEnProgreso = false
    let datosLocalesModificados = false
    let ultimaSincronizacion = 0
    let dispositivoRegistrado = false
    let primeraCarga = true
    const escuchaActiva = false
    let indicadorEstado
    let botonSincronizacion
    let panelDiagnostico
    let cambiosPendientes = {}
    const datosVersiones = {}
  
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
  
    // Verificar si Firestore está disponible
    function verificarFirestore() {
      try {
        return verificarFirebase() && typeof firebase.firestore === "function"
      } catch (e) {
        console.error("Error al verificar Firestore:", e)
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
        if (typeof firebase === 'undefined') {
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
          firstSeen: dispositivoRegistrado ? undefined : firebase.database.ServerValue.TIMESTAMP
        })
  
        console.log("Dispositivo registrado correctamente")
        return true
      } catch (error) {
        console.error("Error al registrar dispositivo:", error)
        return false
      }
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
          datosLocalesModificados = true
          return true
        }
  
        return false
      } catch (e) {
        console.error("Error al detectar cambios:", e)
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
        datosLocalesModificados = false
        cambiosPendientes = {}
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
  
    // Función para guardar cambios en Firebase (incremental)
    async function guardarCambiosEnFirebase() {
      if (sincronizacionEnProgreso) {
        console.log("Ya hay una sincronización en progreso, esperando...")
        return false
      }
  
      if (!inicializarFirebase()) {
        mostrarNotificacion("Firebase no está disponible", "error")
        return false
      }
  
      if (Object.keys(cambiosPendientes).length === 0) {
        console.log("No hay cambios pendientes para sincronizar")
        return false
      }
  
      sincronizacionEnProgreso = true
      actualizarIndicadorEstado("sincronizando")
  
      try {
        // Añadir metadatos
        const cambiosConMetadatos = {
          ...cambiosPendientes,
          _lastModified: firebase.firestore.FieldValue.serverTimestamp(),
          _lastModifiedBy: {
            deviceId: obtenerIdDispositivo(),
            username: obtenerInfoUsuario().username,
            timestamp: new Date().toISOString(),
          },
        }
  
        // Guardar en Firestore usando actualización parcial
        await firebase.firestore().collection("datos").doc("principal").set(cambiosConMetadatos, { merge: true })
        
        console.log("Cambios guardados correctamente en Firebase:", Object.keys(cambiosPendientes))
        mostrarNotificacion("Datos sincronizados correctamente", "success")
        
        // Limpiar cambios pendientes
        cambiosPendientes = {}
        ultimaSincronizacion = Date.now()
        datosLocalesModificados = false
        
        sincronizacionEnProgreso = false
        actualizarIndicadorEstado("conectado")
        return true
      } catch (error) {
        console.error("Error al guardar cambios en Firebase:", error)
        mostrarNotificacion("Error al sincronizar: " + error.message, "error")
        sincronizacionEnProgreso = false
        actualizarIndicadorEstado("error")
        return false
      }
    }
  
    // Función para descargar datos de Firebase
    async function descargarDatosDeFirebase(forzarDescargaCompleta = false) {
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
          
          // Si es primera carga o se fuerza descarga completa, usar datos de Firebase
          if (primeraCarga || forzarDescargaCompleta || !dispositivoRegistrado) {
            console.log("Realizando descarga completa de datos...")
            
            // Eliminar metadatos antes de guardar localmente
            const { _lastModified, _lastModifiedBy, ...datosLimpios } = datosFirebase
            
            // Guardar en localStorage
            localStorage.setItem("tiendaCelulares", JSON.stringify(datosLimpios))
            
            mostrarNotificacion("Datos descargados de Firebase", "success")
            primeraCarga = false
          } else if (datosLocalesModificados) {
            // Si hay datos locales modificados, hacer una fusión inteligente
            console.log("Hay datos locales modificados, realizando fusión inteligente...")
            
            // Obtener datos locales
            const datosLocales = JSON.parse(localStorage.getItem("tiendaCelulares") || "{}")
            
            // Realizar fusión inteligente
            const datosFusionados = fusionarDatos(datosLocales, datosFirebase)
            
            // Guardar datos fusionados localmente
            localStorage.setItem("tiendaCelulares", JSON.stringify(datosFusionados))
            
            // Subir datos fusionados a Firebase
            datosLocalesModificados = true
            await subirDatosAFirebase()
          } else {
            // Verificar si hay cambios comparando timestamps
            const timestampLocal = localStorage.getItem("lastSyncTimestamp") || "0"
            const timestampRemoto = datosFirebase._lastModified ? datosFirebase._lastModified.seconds * 1000 : 0
            
            if (timestampRemoto > Number.parseInt(timestampLocal)) {
              console.log("Hay cambios remotos, actualizando datos locales...")
              
              // Eliminar metadatos antes de guardar localmente
              const { _lastModified, _lastModifiedBy, ...datosLimpios } = datosFirebase
              
              // Guardar en localStorage
              localStorage.setItem("tiendaCelulares", JSON.stringify(datosLimpios))
              localStorage.setItem("lastSyncTimestamp", timestampRemoto.toString())
              
              mostrarNotificacion("Datos actualizados desde Firebase", "success")
            } else {
              console.log("No hay cambios remotos, datos locales actualizados")
            }
          }
          
          ultimaSincronizacion = Date.now()
          sincronizacionEnProgreso = false
          actualizarIndicadorEstado("conectado")
          
          // Actualizar la UI
          actualizarUI()
          
          return true
        } else {
          console.log("No hay datos en Firebase, subiendo datos locales...")
          sincronizacionEnProgreso = false
          datosLocalesModificados = true
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
  
    // Función para cargar datos desde Firebase (incremental)
    async function cargarDatosDesdeFirebase(soloNuevos = true) {
      if (sincronizacionEnProgreso) {
        console.log("Ya hay una sincronización en progreso, esperando...")
        return false
      }
  
      if (!inicializarFirebase()) {
        mostrarNotificacion("Firebase no está disponible", "error")
        return false
      }
  
      sincronizacionEnProgreso = true
      actualizarIndicadorEstado("sincronizando")
  
      try {
        const docSnap = await firebase.firestore().collection("datos").doc("principal").get()
        
        if (docSnap.exists) {
          const datosFirebase = docSnap.data()
          const datosActuales = JSON.parse(localStorage.getItem("tiendaCelulares") || "{}")
          const datosActualizados = Object.assign({}, datosActuales)
          let hayActualizaciones = false
  
          // Si es un dispositivo nuevo o se fuerza descarga completa
          if (!dispositivoRegistrado || !soloNuevos) {
            console.log("Descargando datos completos...")
            
            // Eliminar metadatos
            const { _lastModified, _lastModifiedBy, ...datosLimpios } = datosFirebase
            
            // Guardar en localStorage
            localStorage.setItem("tiendaCelulares", JSON.stringify(datosLimpios))
            mostrarNotificacion("Datos descargados completamente", "success")
            
            // Actualizar UI
            actualizarUI()
            
            sincronizacionEnProgreso = false
            actualizarIndicadorEstado("conectado")
            return true
          }
          
          // Procesar cada sección de datos para actualización incremental
          for (const seccion in datosFirebase) {
            // Ignorar metadatos
            if (seccion.startsWith("_")) continue
  
            // Si ya tenemos esta sección, verificar si hay cambios
            if (datosActuales[seccion]) {
              const hashLocal = calcularHash(datosActuales[seccion])
              const hashRemoto = calcularHash(datosFirebase[seccion])
  
              if (hashLocal !== hashRemoto) {
                datosActualizados[seccion] = datosFirebase[seccion]
                datosVersiones[seccion] = hashRemoto
                hayActualizaciones = true
                console.log("Actualización en sección:", seccion)
              }
            } else {
              // Si no tenemos esta sección, añadirla
              datosActualizados[seccion] = datosFirebase[seccion]
              if (datosFirebase[seccion]) {
                datosVersiones[seccion] = calcularHash(datosFirebase[seccion])
              }
              hayActualizaciones = true
              console.log("Nueva sección:", seccion)
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
          }
  
          ultimaSincronizacion = Date.now()
        } else {
          console.log("No hay datos en Firebase")
          
          // Si no hay datos en Firebase pero tenemos datos locales, subirlos
          const datosLocales = localStorage.getItem("tiendaCelulares")
          if (datosLocales && datosLocales !== "{}") {
            console.log("Subiendo datos locales a Firebase...")
            datosLocalesModificados = true
            await subirDatosAFirebase()
          }
        }
  
        sincronizacionEnProgreso = false
        actualizarIndicadorEstado("conectado")
        return true
      } catch (error) {
        console.error("Error al cargar datos desde Firebase:", error)
        mostrarNotificacion("Error al cargar datos: " + error.message, "error")
        sincronizacionEnProgreso = false
        actualizarIndicadorEstado("error")
        return false
      }
    }
  
    // Función para fusionar datos locales y remotos de manera inteligente
    function fusionarDatos(datosLocales, datosFirebase) {
      // Eliminar metadatos de Firebase
      const { _lastModified, _lastModifiedBy, ...datosFirebaseLimpios } = datosFirebase
  
      // Crear objeto resultado
      const resultado = { ...datosFirebaseLimpios }
  
      // Fusionar inventario
      if (datosLocales.inventario && datosFirebaseLimpios.inventario) {
        resultado.inventario = fusionarInventario(datosLocales.inventario, datosFirebaseLimpios.inventario)
      } else if (datosLocales.inventario) {
        resultado.inventario = datosLocales.inventario
      }
  
      // Fusionar facturas
      if (datosLocales.facturas && datosFirebaseLimpios.facturas) {
        resultado.facturas = fusionarPorId(datosLocales.facturas, datosFirebaseLimpios.facturas, "id")
      } else if (datosLocales.facturas) {
        resultado.facturas = datosLocales.facturas
      }
  
      // Fusionar compras
      if (datosLocales.compras && datosFirebaseLimpios.compras) {
        resultado.compras = fusionarPorId(datosLocales.compras, datosFirebaseLimpios.compras, "id")
      } else if (datosLocales.compras) {
        resultado.compras = datosLocales.compras
      }
  
      // Fusionar clientes
      if (datosLocales.clientes && datosFirebaseLimpios.clientes) {
        resultado.clientes = fusionarPorId(datosLocales.clientes, datosFirebaseLimpios.clientes, "id")
      } else if (datosLocales.clientes) {
        resultado.clientes = datosLocales.clientes
      }
  
      // Fusionar proveedores
      if (datosLocales.proveedores && datosFirebaseLimpios.proveedores) {
        resultado.proveedores = fusionarPorId(datosLocales.proveedores, datosFirebaseLimpios.proveedores, "id")
      } else if (datosLocales.proveedores) {
        resultado.proveedores = datosLocales.proveedores
      }
  
      // Fusionar cuentas por cobrar
      if (datosLocales.cuentasCobrar && datosFirebaseLimpios.cuentasCobrar) {
        resultado.cuentasCobrar = fusionarPorId(datosLocales.cuentasCobrar, datosFirebaseLimpios.cuentasCobrar, "id")
      } else if (datosLocales.cuentasCobrar) {
        resultado.cuentasCobrar = datosLocales.cuentasCobrar
      }
  
      // Fusionar cuentas por pagar
      if (datosLocales.cuentasPagar && datosFirebaseLimpios.cuentasPagar) {
        resultado.cuentasPagar = fusionarPorId(datosLocales.cuentasPagar, datosFirebaseLimpios.cuentasPagar, "id")
      } else if (datosLocales.cuentasPagar) {
        resultado.cuentasPagar = datosLocales.cuentasPagar
      }
  
      // Fusionar ingresos y gastos
      if (datosLocales.ingresos && datosFirebaseLimpios.ingresos) {
        resultado.ingresos = fusionarPorId(datosLocales.ingresos, datosFirebaseLimpios.ingresos, "id")
      } else if (datosLocales.ingresos) {
        resultado.ingresos = datosLocales.ingresos
      }
  
      if (datosLocales.gastos && datosFirebaseLimpios.gastos) {
        resultado.gastos = fusionarPorId(datosLocales.gastos, datosFirebaseLimpios.gastos, "id")
      } else if (datosLocales.gastos) {
        resultado.gastos = datosLocales.gastos
      }
  
      // Fusionar capital y ganancias
      if (datosLocales.capital && datosFirebaseLimpios.capital) {
        resultado.capital = fusionarCapital(datosLocales.capital, datosFirebaseLimpios.capital)
      } else if (datosLocales.capital) {
        resultado.capital = datosLocales.capital
      }
  
      if (datosLocales.ganancias !== undefined && datosFirebaseLimpios.ganancias !== undefined) {
        resultado.ganancias = Math.max(datosLocales.ganancias, datosFirebaseLimpios.ganancias)
      } else if (datosLocales.ganancias !== undefined) {
        resultado.ganancias = datosLocales.ganancias
      }
  
      return resultado
    }
  
    // Función para fusionar inventario
    function fusionarInventario(inventarioLocal, inventarioFirebase) {
      // Crear mapa para búsqueda rápida
      const mapaFirebase = {}
      inventarioFirebase.forEach((producto) => {
        mapaFirebase[producto.codigo] = producto
      })
  
      // Fusionar productos
      const resultado = []
      const codigosAgregados = {}
  
      // Primero añadir productos locales
      inventarioLocal.forEach((productoLocal) => {
        const codigo = productoLocal.codigo
        codigosAgregados[codigo] = true
  
        if (mapaFirebase[codigo]) {
          // El producto existe en ambos, usar el más reciente
          const productoFirebase = mapaFirebase[codigo]
  
          // Determinar cuál es más reciente (por fecha o algún otro criterio)
          // Aquí asumimos que si el producto local tiene una cantidad diferente, es más reciente
          if (productoLocal.cantidad !== productoFirebase.cantidad) {
            resultado.push(productoLocal)
          } else {
            resultado.push(productoFirebase)
          }
        } else {
          // El producto solo existe localmente
          resultado.push(productoLocal)
        }
      })
  
      // Añadir productos que solo existen en Firebase
      inventarioFirebase.forEach((productoFirebase) => {
        const codigo = productoFirebase.codigo
        if (!codigosAgregados[codigo]) {
          resultado.push(productoFirebase)
        }
      })
  
      return resultado
    }
  
    // Función para fusionar capital
    function fusionarCapital(capitalLocal, capitalFirebase) {
      // Estrategia simple: usar el valor más alto para cada componente
      return {
        productos: Math.max(capitalLocal.productos || 0, capitalFirebase.productos || 0),
        efectivo: Math.max(capitalLocal.efectivo || 0, capitalFirebase.efectivo || 0),
        banco: Math.max(capitalLocal.banco || 0, capitalFirebase.banco || 0)
      }
    }
  
    // Función para fusionar arrays por ID
    function fusionarPorId(arrayLocal, arrayFirebase, campoId) {
      // Crear mapa para búsqueda rápida
      const mapaFirebase = {}
      arrayFirebase.forEach((item) => {
        if (item[campoId]) {
          mapaFirebase[item[campoId]] = item
        }
      })
  
      // Fusionar items
      const resultado = []
      const idsAgregados = {}
  
      // Primero añadir items locales
      arrayLocal.forEach((itemLocal) => {
        const id = itemLocal[campoId]
        if (!id) {
          resultado.push(itemLocal)
          return
        }
        
        idsAgregados[id] = true
  
        if (mapaFirebase[id]) {
          // El item existe en ambos, usar el más reciente
          const itemFirebase = mapaFirebase[id]
  
          // Determinar cuál es más reciente (por fecha o algún otro criterio)
          // Aquí simplemente usamos el local asumiendo que es más reciente
          resultado.push(itemLocal)
        } else {
          // El item solo existe localmente
          resultado.push(itemLocal)
        }
      })
  
      // Añadir items que solo existen en Firebase
      arrayFirebase.forEach((itemFirebase) => {
        const id = itemFirebase[campoId]
        if (id && !idsAgregados[id]) {
          resultado.push(itemFirebase)
        }
      })
  
      return resultado
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
      if (typeof window.actualizarTablaCuentasPagar === "function" && document.getElementById("cuerpoTablaCuentasPagar")) {
        window.actualizarTablaCuentasPagar()
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
      sincronizarDatos(true)
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
        <div id="firestore-status" style="margin-bottom: 10px;">
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: #FFC107; margin-right: 5px;"></span>
          <span>Firestore: Verificando...</span>
        </div>
        <div id="dispositivo-status" style="margin-bottom: 10px;">
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: #FFC107; margin-right: 5px;"></span>
          <span>Dispositivo: Verificando...</span>
        </div>
        <div id="ultima-sincronizacion" style="margin-bottom: 15px;">
          Última sincronización: Nunca
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 5px;">
          <button id="btn-subir" style="flex: 1; padding: 8px; background-color: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">Subir Datos</button>
          <button id="btn-descargar" style="flex: 1; padding: 8px; background-color: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">Descargar Datos</button>
          <button id="btn-forzar" style="flex: 1; padding: 8px; background-color: #fd7e14; color: white; border: none; border-radius: 3px; cursor: pointer;">Forzar Descarga</button>
          <button id="btn-cerrar" style="flex: 1; padding: 8px; background-color: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">Cerrar</button>
        </div>
      `
  
    document.body.appendChild(panelDiagnostico)
  
    // Añadir eventos a los botones
    document.getElementById("btn-subir").addEventListener("click", () => {
      subirDatosAFirebase()
    })
  
    document.getElementById("btn-descargar").addEventListener("click", () => {
      cargarDatosDesdeFirebase(true)
    })
  
    document.getElementById("btn-forzar").addEventListener("click", () => {
      cargarDatosDesdeFirebase(false)
    })
  
    document.getElementById("btn-cerrar").addEventListener("click", () => {
      panelDiagnostico.style.display = "none"
    })
  }
  
  // Función para actualizar panel de diagnóstico
  function actualizarEstadoDiagnostico() {
    if (!panelDiagnostico) return
  
    const firebaseDisponible = verificarFirebase()
    const firestoreDisponible = verificarFirestore()
  
    // Actualizar estado de Firebase
    const firebaseStatus = document.getElementById("firebase-status")
    if (firebaseStatus) {
      firebaseStatus.innerHTML = `
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${firebaseDisponible ? "#4CAF50" : "#F44336"}; margin-right: 5px;"></span>
          <span>Firebase: ${firebaseDisponible ? "Disponible" : "No disponible"}</span>
        `
    }
  
    // Actualizar estado de Firestore
    const firestoreStatus = document.getElementById("firestore-status")
    if (firestoreStatus) {
      firestoreStatus.innerHTML = `
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${firestoreDisponible ? "#4CAF50" : "#F44336"}; margin-right: 5px;"></span>
          <span>Firestore: ${firestoreDisponible ? "Disponible" : "No disponible"}</span>
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
  
    // Actualizar última sincronización
    const ultimaSincronizacionElement = document.getElementById("ultima-sincronizacion")
    if (ultimaSincronizacionElement) {
      ultimaSincronizacionElement.textContent =
        "Última sincronización: " + (ultimaSincronizacion > 0 ? new Date(ultimaSincronizacion).toLocaleString() : "Nunca")
    }
  }
  
  // Función para sincronizar datos (bidireccional)
  async function sincronizarDatos(forzarDescargaCompleta = false) {
    console.log("Iniciando sincronización bidireccional...")
  
    // Registrar dispositivo si es necesario
    if (!dispositivoRegistrado) {
      await registrarDispositivo()
    }
  
    // Si hay datos locales modificados, subir primero
    if (datosLocalesModificados) {
      await subirDatosAFirebase()
    } else {
      // Si no hay modificaciones locales, detectar cambios primero
      detectarCambios()
      if (Object.keys(cambiosPendientes).length > 0) {
        await guardarCambiosEnFirebase()
      }
    }
  
    // Descargar datos (completos si es un dispositivo nuevo o se fuerza)
    await cargarDatosDesdeFirebase(!forzarDescargaCompleta)
  
    // Actualizar panel de diagnóstico
    actualizarEstadoDiagnostico()
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
  
      // Marcar que hay datos locales modificados
      datosLocalesModificados = true
  
      // Detectar cambios específicos
      detectarCambios()
  
      // Sincronizar con Firebase con un pequeño retraso
      clearTimeout(window._syncTimeout)
      window._syncTimeout = setTimeout(() => {
        guardarCambiosEnFirebase()
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
  
          // Si hay datos locales modificados, sincronizar
          if (datosLocalesModificados) {
            setTimeout(() => {
              sincronizarDatos()
            }, 2000)
          }
        } else {
          console.log("Desconectado de Firebase")
          actualizarIndicadorEstado("desconectado")
        }
      })
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
              cargarDatosDesdeFirebase(true)
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
  
  // Inicializar todo el sistema
  async function inicializarSistema() {
    console.log("Inicializando sistema de sincronización bidireccional...")
  
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
  
    // Sincronizar datos al inicio
    setTimeout(() => {
      sincronizarDatos(primeraCarga)
    }, 2000)
  
    console.log("Sistema de sincronización bidireccional inicializado correctamente")
  }
  
  // Iniciar cuando el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializarSistema)
  } else {
    inicializarSistema()
  }
  
  // Exponer funciones útiles globalmente
  window.sincronizarConFirebase = sincronizarDatos
  window.subirDatosAFirebase = subirDatosAFirebase
  window.descargarDatosDeFirebase = cargarDatosDesdeFirebase
  window.forzarDescargaCompleta = () => cargarDatosDesdeFirebase(false)
  window.guardarCambiosEnFirebase = guardarCambiosEnFirebase
  })()
  
  