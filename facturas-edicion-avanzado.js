// Sistema avanzado para edición de facturas con capacidades de depuración
;(() => {
    console.log("Inicializando sistema avanzado de edición de facturas con depuración...")
  
    // Variables globales
    let facturaOriginal = null
    let productosOriginales = []
    let inventarioActual = []
    let todasLasFacturas = [] // Almacenar todas las facturas para depuración
  
    // Esperar a que el DOM esté completamente cargado
    document.addEventListener("DOMContentLoaded", () => {
      // Configurar un observador de mutaciones para detectar cuando se carga la tabla de registros
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.addedNodes && mutation.addedNodes.length > 0) {
            // Verificar si la tabla de registros está presente
            if (document.getElementById("cuerpoTablaRegistros")) {
              inicializarSistemaEdicion()
            }
          }
        })
      })
  
      // Iniciar observación del documento
      observer.observe(document.body, { childList: true, subtree: true })
  
      // Intentar inicializar inmediatamente si la tabla ya está cargada
      if (document.getElementById("cuerpoTablaRegistros")) {
        inicializarSistemaEdicion()
      }
    })
  
    // Función principal para inicializar el sistema de edición
    function inicializarSistemaEdicion() {
      // Verificar si ya se ha inicializado
      if (window.edicionFacturasAvanzadaHabilitada) return
      window.edicionFacturasAvanzadaHabilitada = true
  
      console.log("Inicializando sistema de edición de facturas avanzado...")
  
      // Cargar todas las facturas para depuración
      cargarTodasLasFacturas()
  
      // Interceptar el cambio de tipo de registro para agregar botones de edición
      const tipoRegistroSelect = document.getElementById("tipoRegistro")
      if (tipoRegistroSelect) {
        // Guardar la función original de cambio
        const originalChangeHandler = tipoRegistroSelect.onchange
  
        // Reemplazar con nuestra versión
        tipoRegistroSelect.onchange = function (event) {
          // Llamar a la función original primero
          if (originalChangeHandler) {
            originalChangeHandler.call(this, event)
          }
  
          // Si se seleccionan facturas, agregar botones de edición
          if (this.value === "facturas") {
            setTimeout(() => {
              agregarBotonesEdicion()
              agregarBotonSeleccionManual() // Agregar botón para selección manual
            }, 500)
          }
        }
  
        // Si ya está seleccionado "facturas", agregar botones
        if (tipoRegistroSelect.value === "facturas") {
          setTimeout(() => {
            agregarBotonesEdicion()
            agregarBotonSeleccionManual() // Agregar botón para selección manual
          }, 500)
        }
      }
  
      // Agregar estilos CSS para el sistema de edición
      agregarEstilosCSS()
  
      // Crear modal para edición de facturas
      crearModalEdicionFactura()
  
      // Crear modal para selección manual de facturas
      crearModalSeleccionFactura()
  
      // Exponer funciones globalmente para debugging
      window.editarFactura = editarFactura
      window.guardarCambiosFactura = guardarCambiosFactura
      window.mostrarSeleccionFacturas = mostrarSeleccionFacturas
      window.depurarFacturas = depurarFacturas
    }
  
    // Función para cargar todas las facturas
    function cargarTodasLasFacturas() {
      try {
        const datos = JSON.parse(localStorage.getItem("tiendaCelulares") || "{}")
        if (datos.facturas && Array.isArray(datos.facturas)) {
          todasLasFacturas = datos.facturas
          console.log(`Se cargaron ${todasLasFacturas.length} facturas para depuración`)
        } else {
          console.warn("No se encontraron facturas en localStorage")
        }
      } catch (error) {
        console.error("Error al cargar facturas:", error)
      }
    }
  
    // Función para depurar facturas (mostrar en consola)
    function depurarFacturas() {
      console.log("=== DEPURACIÓN DE FACTURAS ===")
      console.log(`Total de facturas: ${todasLasFacturas.length}`)
  
      if (todasLasFacturas.length > 0) {
        console.log("Estructura de la primera factura:", todasLasFacturas[0])
        console.log(
          "IDs de facturas disponibles:",
          todasLasFacturas.map((f) => f.id),
        )
      }
  
      // Mostrar estructura del localStorage
      try {
        const datos = JSON.parse(localStorage.getItem("tiendaCelulares") || "{}")
        console.log("Estructura de datos en localStorage:", Object.keys(datos))
      } catch (error) {
        console.error("Error al analizar localStorage:", error)
      }
    }
  
    // Función para agregar botón de selección manual
    function agregarBotonSeleccionManual() {
      // Verificar si ya existe el botón
      if (document.getElementById("btn-seleccion-manual-factura")) return
  
      const contenedor = document.querySelector(".controls") || document.querySelector(".registros-controls")
      if (!contenedor) return
  
      const boton = document.createElement("button")
      boton.id = "btn-seleccion-manual-factura"
      boton.className = "action-button"
      boton.innerHTML = '<i class="fas fa-list"></i> Seleccionar Factura'
      boton.onclick = mostrarSeleccionFacturas
  
      contenedor.appendChild(boton)
    }
  
    // Función para mostrar modal de selección de facturas
    function mostrarSeleccionFacturas() {
      // Actualizar la lista de facturas
      cargarTodasLasFacturas()
  
      // Llenar la tabla con las facturas disponibles
      const tbody = document.getElementById("cuerpoTablaSeleccionFactura")
      tbody.innerHTML = ""
  
      todasLasFacturas.forEach((factura, index) => {
        const tr = document.createElement("tr")
  
        // Formatear fecha si es necesario
        const fecha = factura.fecha || "N/A"
  
        tr.innerHTML = `
          <td>${factura.id || "Sin ID"}</td>
          <td>${fecha}</td>
          <td>${factura.cliente || "Sin cliente"}</td>
          <td>$${factura.total ? factura.total.toFixed(2) : "0.00"}</td>
          <td>
            <button type="button" class="btn-seleccionar-factura" onclick="editarFactura('${factura.id}')">
              Seleccionar
            </button>
          </td>
        `
  
        tbody.appendChild(tr)
      })
  
      // Mostrar el modal
      document.getElementById("modalSeleccionFactura").style.display = "block"
    }
  
    // Función para crear modal de selección de facturas
    function crearModalSeleccionFactura() {
      const modal = document.createElement("div")
      modal.className = "modal-editar-factura"
      modal.id = "modalSeleccionFactura"
      modal.innerHTML = `
        <div class="modal-editar-factura-content">
          <span class="modal-editar-factura-close">&times;</span>
          <h3>Seleccionar Factura para Editar</h3>
          
          <div class="table-responsive">
            <table class="factura-productos-tabla">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody id="cuerpoTablaSeleccionFactura">
                <!-- Aquí se cargarán las facturas -->
              </tbody>
            </table>
          </div>
          
          <div style="text-align: right; margin-top: 20px;">
            <button type="button" class="btn-cancelar" onclick="document.getElementById('modalSeleccionFactura').style.display='none'">
              Cerrar
            </button>
          </div>
        </div>
      `
      document.body.appendChild(modal)
  
      // Configurar evento para cerrar el modal
      const closeBtn = modal.querySelector(".modal-editar-factura-close")
      closeBtn.onclick = () => {
        modal.style.display = "none"
      }
  
      window.onclick = (event) => {
        if (event.target === modal) {
          modal.style.display = "none"
        }
      }
    }
  
    // Función para agregar estilos CSS
    function agregarEstilosCSS() {
      const style = document.createElement("style")
      style.textContent = `
        .btn-editar-factura {
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 3px;
          padding: 3px 8px;
          margin-left: 5px;
          cursor: pointer;
          font-size: 12px;
        }
        .btn-editar-factura:hover {
          background-color: #45a049;
        }
        .btn-seleccionar-factura {
          background-color: #2196F3;
          color: white;
          border: none;
          border-radius: 3px;
          padding: 3px 8px;
          cursor: pointer;
          font-size: 12px;
        }
        .btn-seleccionar-factura:hover {
          background-color: #0b7dda;
        }
        .modal-editar-factura {
          display: none;
          position: fixed;
          z-index: 10000;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0,0,0,0.5);
          overflow-y: auto;
        }
        .modal-editar-factura-content {
          background-color: #fefefe;
          margin: 5% auto;
          padding: 20px;
          border-radius: 5px;
          width: 90%;
          max-width: 900px;
        }
        .modal-editar-factura-close {
          color: #aaa;
          float: right;
          font-size: 28px;
          font-weight: bold;
          cursor: pointer;
        }
        .modal-editar-factura-close:hover {
          color: black;
        }
        .factura-productos-tabla {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .factura-productos-tabla th, .factura-productos-tabla td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        .factura-productos-tabla th {
          background-color: #f2f2f2;
        }
        .factura-productos-tabla tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .btn-eliminar-producto {
          background-color: #f44336;
          color: white;
          border: none;
          border-radius: 3px;
          padding: 3px 8px;
          cursor: pointer;
        }
        .btn-eliminar-producto:hover {
          background-color: #d32f2f;
        }
        .btn-agregar-producto {
          background-color: #2196F3;
          color: white;
          border: none;
          border-radius: 3px;
          padding: 5px 10px;
          cursor: pointer;
          margin-bottom: 15px;
        }
        .btn-agregar-producto:hover {
          background-color: #0b7dda;
        }
        .form-row {
          display: flex;
          flex-wrap: wrap;
          margin-bottom: 15px;
        }
        .form-group {
          flex: 1;
          min-width: 200px;
          margin-right: 15px;
          margin-bottom: 10px;
        }
        .form-group:last-child {
          margin-right: 0;
        }
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        .form-group input, .form-group select {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .btn-guardar {
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 10px 15px;
          cursor: pointer;
          font-size: 14px;
        }
        .btn-guardar:hover {
          background-color: #45a049;
        }
        .btn-cancelar {
          background-color: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 10px 15px;
          cursor: pointer;
          font-size: 14px;
          margin-right: 10px;
        }
        .btn-cancelar:hover {
          background-color: #d32f2f;
        }
        .sugerencias-productos {
          position: absolute;
          background-color: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          max-height: 200px;
          overflow-y: auto;
          width: 100%;
          z-index: 1000;
          display: none;
        }
        .sugerencia-item {
          padding: 8px 10px;
          cursor: pointer;
        }
        .sugerencia-item:hover {
          background-color: #f1f1f1;
        }
        .resumen-factura {
          background-color: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 15px;
          margin-top: 20px;
        }
        .resumen-factura h4 {
          margin-top: 0;
          margin-bottom: 10px;
        }
        .resumen-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        .resumen-total {
          font-weight: bold;
          font-size: 16px;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #ddd;
        }
      `
      document.head.appendChild(style)
    }
  
    // Función para crear el modal de edición de facturas
    function crearModalEdicionFactura() {
      const modal = document.createElement("div")
      modal.className = "modal-editar-factura"
      modal.id = "modalEditarFactura"
      modal.innerHTML = `
        <div class="modal-editar-factura-content">
          <span class="modal-editar-factura-close">&times;</span>
          <h3>Editar Factura</h3>
          
          <form id="formEditarFactura">
            <div class="form-row">
              <div class="form-group">
                <label for="editarClienteFactura">Cliente:</label>
                <input type="text" id="editarClienteFactura">
              </div>
              <div class="form-group">
                <label for="editarFechaFactura">Fecha:</label>
                <input type="text" id="editarFechaFactura" readonly>
              </div>
              <div class="form-group">
                <label for="editarTipoFactura">Tipo:</label>
                <select id="editarTipoFactura">
                  <option value="contado">Contado</option>
                  <option value="credito">Crédito</option>
                </select>
              </div>
            </div>
            
            <h4>Productos</h4>
            <div id="productosContainer">
              <table class="factura-productos-tabla" id="tablaProductosFactura">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio</th>
                    <th>Subtotal</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody id="cuerpoTablaProductosFactura">
                  <!-- Aquí se cargarán los productos -->
                </tbody>
              </table>
            </div>
            
            <button type="button" id="btnAgregarProducto" class="btn-agregar-producto">
              <i class="fas fa-plus"></i> Agregar Producto
            </button>
            
            <div class="resumen-factura">
              <h4>Resumen</h4>
              <div class="resumen-item">
                <span>Subtotal:</span>
                <span id="subtotalFactura">$0.00</span>
              </div>
              <div class="resumen-item">
                <span>IVA (0%):</span>
                <span id="ivaFactura">$0.00</span>
              </div>
              <div class="resumen-total">
                <span>Total:</span>
                <span id="totalFactura">$0.00</span>
              </div>
            </div>
            
            <input type="hidden" id="editarIdFactura">
            <div style="text-align: right; margin-top: 20px;">
              <button type="button" id="btnCancelarEdicion" class="btn-cancelar">Cancelar</button>
              <button type="submit" class="btn-guardar">Guardar Cambios</button>
            </div>
          </form>
          
          <!-- Modal para agregar producto -->
          <div id="modalAgregarProducto" style="display: none; position: fixed; z-index: 10001; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7);">
            <div style="background-color: white; margin: 10% auto; padding: 20px; border-radius: 5px; width: 80%; max-width: 500px;">
              <h4>Agregar Producto</h4>
              <div class="form-group" style="position: relative;">
                <label for="buscarProducto">Buscar Producto:</label>
                <input type="text" id="buscarProducto" placeholder="Nombre o código del producto">
                <div id="sugerenciasProductos" class="sugerencias-productos"></div>
              </div>
              <div class="form-group">
                <label for="cantidadProducto">Cantidad:</label>
                <input type="number" id="cantidadProducto" min="1" value="1">
              </div>
              <div class="form-group">
                <label for="precioProducto">Precio:</label>
                <input type="number" id="precioProducto" step="0.01" value="0.00">
              </div>
              <div style="text-align: right; margin-top: 20px;">
                <button type="button" id="btnCancelarAgregarProducto" class="btn-cancelar">Cancelar</button>
                <button type="button" id="btnConfirmarAgregarProducto" class="btn-guardar">Agregar</button>
              </div>
            </div>
          </div>
        </div>
      `
      document.body.appendChild(modal)
  
      // Configurar eventos del modal principal
      const closeBtn = modal.querySelector(".modal-editar-factura-close")
      const cancelBtn = document.getElementById("btnCancelarEdicion")
      const form = document.getElementById("formEditarFactura")
      const btnAgregarProducto = document.getElementById("btnAgregarProducto")
  
      closeBtn.onclick = () => {
        modal.style.display = "none"
      }
  
      cancelBtn.onclick = () => {
        modal.style.display = "none"
      }
  
      window.onclick = (event) => {
        if (event.target === modal) {
          modal.style.display = "none"
        }
  
        const modalAgregarProducto = document.getElementById("modalAgregarProducto")
        if (event.target === modalAgregarProducto) {
          modalAgregarProducto.style.display = "none"
        }
      }
  
      form.onsubmit = (event) => {
        event.preventDefault()
        guardarCambiosFactura()
      }
  
      btnAgregarProducto.onclick = () => {
        abrirModalAgregarProducto()
      }
  
      // Configurar eventos del modal para agregar producto
      const btnCancelarAgregarProducto = document.getElementById("btnCancelarAgregarProducto")
      const btnConfirmarAgregarProducto = document.getElementById("btnConfirmarAgregarProducto")
      const buscarProductoInput = document.getElementById("buscarProducto")
  
      btnCancelarAgregarProducto.onclick = () => {
        document.getElementById("modalAgregarProducto").style.display = "none"
      }
  
      btnConfirmarAgregarProducto.onclick = () => {
        agregarProductoAFactura()
      }
  
      buscarProductoInput.oninput = function () {
        buscarProductos(this.value)
      }
  
      buscarProductoInput.onfocus = function () {
        if (this.value.length > 0) {
          buscarProductos(this.value)
        }
      }
    }
  
    // Función para agregar botones de edición a las facturas
    function agregarBotonesEdicion() {
      console.log("Agregando botones de edición a las facturas...")
  
      const filas = document.querySelectorAll("#cuerpoTablaRegistros tr")
      filas.forEach((fila) => {
        // Verificar si ya tiene botón de edición
        if (fila.querySelector(".btn-editar-factura")) return
  
        // Verificar si es una fila de factura
        const celdas = fila.querySelectorAll("td")
        if (celdas.length >= 4) {
          // Intentar obtener el ID de la factura de varias maneras
          let idFactura = null
  
          // Método 1: Buscar en el botón de detalles
          const detallesBtn = fila.querySelector("button.action-button")
          if (detallesBtn) {
            const onclickAttr = detallesBtn.getAttribute("onclick") || ""
            const match = onclickAttr.match(/verDetallesFactura$$['"]([^'"]+)['"]$$/)
            if (match && match[1]) {
              idFactura = match[1]
            }
          }
  
          // Si no se encontró, intentar con el método alternativo
          if (!idFactura) {
            idFactura = obtenerIdFacturaAlternativo(fila)
          }
  
          // Si tenemos un ID, crear el botón de edición
          if (idFactura) {
            console.log("ID de factura encontrado:", idFactura)
  
            // Crear botón de edición
            const btnEditar = document.createElement("button")
            btnEditar.className = "btn-editar-factura"
            btnEditar.innerHTML = '<i class="fas fa-edit"></i> Editar'
            btnEditar.onclick = (event) => {
              event.preventDefault()
              event.stopPropagation()
              editarFactura(idFactura)
              return false
            }
  
            // Agregar botón a la última celda
            const ultimaCelda = celdas[celdas.length - 1]
            ultimaCelda.appendChild(btnEditar)
          }
        }
      })
    }
  
    // Función para editar una factura
    function editarFactura(idFactura) {
      console.log("Editando factura con ID:", idFactura)
  
      try {
        // Obtener datos actuales
        const datos = JSON.parse(localStorage.getItem("tiendaCelulares") || "{}")
  
        if (!datos.facturas || !Array.isArray(datos.facturas)) {
          console.error("No se encontraron facturas en localStorage:", datos)
          alert("No se encontraron facturas para editar.")
          return
        }
  
        console.log("Total de facturas encontradas:", datos.facturas.length)
  
        // Buscar la factura usando la función flexible
        const factura = buscarFacturaPorId(datos, idFactura)
  
        if (!factura) {
          console.error("No se encontró la factura con ID:", idFactura)
          console.log(
            "IDs de facturas disponibles:",
            datos.facturas.map((f) => f.id),
          )
  
          // Mostrar un mensaje más detallado y ofrecer selección manual
          if (
            confirm(
              `No se encontró la factura especificada (ID: ${idFactura}).\n\n¿Desea seleccionar una factura manualmente?`,
            )
          ) {
            mostrarSeleccionFacturas()
          }
          return
        }
  
        console.log("Factura encontrada:", factura)
  
        // Guardar factura original para comparar cambios después
        facturaOriginal = JSON.parse(JSON.stringify(factura))
  
        // Cargar inventario actual
        inventarioActual = datos.inventario || []
  
        // Llenar el formulario con los datos de la factura
        document.getElementById("editarIdFactura").value = factura.id
        document.getElementById("editarClienteFactura").value = factura.cliente
        document.getElementById("editarFechaFactura").value = factura.fecha
        document.getElementById("editarTipoFactura").value = factura.tipo || "contado"
  
        // Cargar productos de la factura
        cargarProductosFactura(factura.productos || [])
  
        // Actualizar totales
        actualizarTotalesFactura()
  
        // Mostrar el modal
        document.getElementById("modalEditarFactura").style.display = "block"
      } catch (error) {
        console.error("Error al cargar factura para edición:", error)
        alert("Error al cargar factura: " + error.message)
      }
    }
  
    // Agregar una función para buscar facturas de manera más flexible
    function buscarFacturaPorId(datos, idFactura) {
      if (!datos.facturas || !Array.isArray(datos.facturas)) {
        return null
      }
  
      // Método 1: Búsqueda exacta por ID
      let factura = datos.facturas.find((f) => f.id === idFactura)
      if (factura) return factura
  
      // Método 2: Búsqueda por ID como número (por si acaso)
      if (!isNaN(idFactura)) {
        factura = datos.facturas.find((f) => f.id === Number(idFactura))
        if (factura) return factura
      }
  
      // Método 3: Búsqueda por ID como string (por si acaso)
      factura = datos.facturas.find((f) => String(f.id) === String(idFactura))
      if (factura) return factura
  
      // Método 4: Búsqueda por otros campos que podrían ser identificadores
      factura = datos.facturas.find(
        (f) =>
          (f.numero && f.numero === idFactura) ||
          (f.codigo && f.codigo === idFactura) ||
          (f.facturaId && f.facturaId === idFactura),
      )
  
      return factura
    }
  
    // Función para cargar los productos de la factura en la tabla
    function cargarProductosFactura(productos) {
      const tbody = document.getElementById("cuerpoTablaProductosFactura")
      tbody.innerHTML = ""
  
      // Guardar productos originales para comparar cambios después
      productosOriginales = JSON.parse(JSON.stringify(productos))
  
      productos.forEach((producto, index) => {
        const tr = document.createElement("tr")
        tr.setAttribute("data-index", index)
  
        // Asegurarse de que precio y cantidad sean números
        const cantidad = Number(producto.cantidad) || 1
        const precio = Number(producto.precio) || 0
        const subtotal = (cantidad * precio).toFixed(2)
  
        // Asegurarse de que el código y precio de compra estén presentes
        const codigo = producto.codigo || ""
        const precioCompra = producto.precioCompra || 0
  
        tr.setAttribute("data-codigo", codigo)
        tr.setAttribute("data-precio-compra", precioCompra)
  
        tr.innerHTML = `
          <td>${producto.nombre}</td>
          <td>
            <input type="number" class="cantidad-producto" value="${cantidad}" min="1" 
                   onchange="actualizarCantidadProducto(this, ${index})" style="width: 60px;">
          </td>
          <td>
            <input type="number" class="precio-producto" value="${precio.toFixed(2)}" step="0.01" 
                   onchange="actualizarPrecioProducto(this, ${index})" style="width: 80px;">
          </td>
          <td>$${subtotal}</td>
          <td>
            <button type="button" class="btn-eliminar-producto" onclick="eliminarProductoFactura(${index})">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        `
  
        tbody.appendChild(tr)
      })
  
      // Definir funciones globales para los eventos
      window.actualizarCantidadProducto = (input, index) => {
        const cantidad = Number.parseInt(input.value) || 1
        if (cantidad < 1) {
          input.value = 1
          return
        }
  
        const tr = input.closest("tr")
        const precioInput = tr.querySelector(".precio-producto")
        const precio = Number.parseFloat(precioInput.value) || 0
  
        const subtotal = (cantidad * precio).toFixed(2)
        tr.cells[3].textContent = "$" + subtotal
  
        actualizarTotalesFactura()
      }
  
      window.actualizarPrecioProducto = (input, index) => {
        const precio = Number.parseFloat(input.value) || 0
        if (precio < 0) {
          input.value = 0
          return
        }
  
        const tr = input.closest("tr")
        const cantidadInput = tr.querySelector(".cantidad-producto")
        const cantidad = Number.parseInt(cantidadInput.value) || 1
  
        const subtotal = (cantidad * precio).toFixed(2)
        tr.cells[3].textContent = "$" + subtotal
  
        actualizarTotalesFactura()
      }
  
      window.eliminarProductoFactura = (index) => {
        if (confirm("¿Está seguro de eliminar este producto de la factura?")) {
          const tbody = document.getElementById("cuerpoTablaProductosFactura")
          const filas = tbody.querySelectorAll("tr")
  
          for (let i = 0; i < filas.length; i++) {
            if (Number.parseInt(filas[i].getAttribute("data-index")) === index) {
              tbody.removeChild(filas[i])
              break
            }
          }
  
          // Actualizar índices de las filas restantes
          const filasRestantes = tbody.querySelectorAll("tr")
          for (let i = 0; i < filasRestantes.length; i++) {
            filasRestantes[i].setAttribute("data-index", i)
  
            // Actualizar onclick de los botones
            const btnEliminar = filasRestantes[i].querySelector(".btn-eliminar-producto")
            btnEliminar.setAttribute("onclick", `eliminarProductoFactura(${i})`)
  
            // Actualizar onchange de los inputs
            const inputCantidad = filasRestantes[i].querySelector(".cantidad-producto")
            inputCantidad.setAttribute("onchange", `actualizarCantidadProducto(this, ${i})`)
  
            const inputPrecio = filasRestantes[i].querySelector(".precio-producto")
            inputPrecio.setAttribute("onchange", `actualizarPrecioProducto(this, ${i})`)
          }
  
          actualizarTotalesFactura()
        }
      }
    }
  
    // Función para actualizar los totales de la factura
    function actualizarTotalesFactura() {
      let subtotal = 0
  
      const filas = document.querySelectorAll("#cuerpoTablaProductosFactura tr")
      filas.forEach((fila) => {
        const cantidadInput = fila.querySelector(".cantidad-producto")
        const precioInput = fila.querySelector(".precio-producto")
  
        const cantidad = Number.parseInt(cantidadInput.value) || 0
        const precio = Number.parseFloat(precioInput.value) || 0
  
        subtotal += cantidad * precio
      })
  
      const iva = 0 // Si se necesita calcular IVA, cambiar aquí
      const total = subtotal + iva
  
      document.getElementById("subtotalFactura").textContent = "$" + subtotal.toFixed(2)
      document.getElementById("ivaFactura").textContent = "$" + iva.toFixed(2)
      document.getElementById("totalFactura").textContent = "$" + total.toFixed(2)
    }
  
    // Función para abrir el modal de agregar producto
    function abrirModalAgregarProducto() {
      // Limpiar campos
      document.getElementById("buscarProducto").value = ""
      document.getElementById("cantidadProducto").value = "1"
      document.getElementById("precioProducto").value = "0.00"
      document.getElementById("sugerenciasProductos").innerHTML = ""
      document.getElementById("sugerenciasProductos").style.display = "none"
  
      // Mostrar modal
      document.getElementById("modalAgregarProducto").style.display = "block"
    }
  
    // Función para buscar productos en el inventario
    function buscarProductos(termino) {
      if (!termino || termino.length < 2) {
        document.getElementById("sugerenciasProductos").style.display = "none"
        return
      }
  
      try {
        // Obtener inventario
        const datos = JSON.parse(localStorage.getItem("tiendaCelulares") || "{}")
        const inventario = datos.inventario || []
  
        // Filtrar productos que coincidan con el término de búsqueda
        const terminoLower = termino.toLowerCase()
        const productosFiltrados = inventario.filter(
          (producto) =>
            producto.nombre.toLowerCase().includes(terminoLower) ||
            (producto.codigo && producto.codigo.toLowerCase().includes(terminoLower)),
        )
  
        // Mostrar sugerencias
        const sugerenciasContainer = document.getElementById("sugerenciasProductos")
        sugerenciasContainer.innerHTML = ""
  
        if (productosFiltrados.length === 0) {
          sugerenciasContainer.style.display = "none"
          return
        }
  
        productosFiltrados.forEach((producto) => {
          const div = document.createElement("div")
          div.className = "sugerencia-item"
          div.textContent = `${producto.nombre} - $${producto.precioVenta.toFixed(2)}`
          div.onclick = () => {
            seleccionarProducto(producto)
          }
          sugerenciasContainer.appendChild(div)
        })
  
        sugerenciasContainer.style.display = "block"
      } catch (error) {
        console.error("Error al buscar productos:", error)
      }
    }
  
    // Función para seleccionar un producto de las sugerencias
    function seleccionarProducto(producto) {
      document.getElementById("buscarProducto").value = producto.nombre
      document.getElementById("precioProducto").value = producto.precioVenta.toFixed(2)
      document.getElementById("sugerenciasProductos").style.display = "none"
  
      // Guardar referencia al producto seleccionado
      document.getElementById("buscarProducto").setAttribute("data-codigo", producto.codigo)
      document.getElementById("buscarProducto").setAttribute("data-precio-compra", producto.precioCompra)
    }
  
    // Función para agregar un producto a la factura
    function agregarProductoAFactura() {
      const nombreProducto = document.getElementById("buscarProducto").value
      const cantidad = Number.parseInt(document.getElementById("cantidadProducto").value) || 1
      const precio = Number.parseFloat(document.getElementById("precioProducto").value) || 0
      const codigoProducto = document.getElementById("buscarProducto").getAttribute("data-codigo")
      const precioCompra =
        Number.parseFloat(document.getElementById("buscarProducto").getAttribute("data-precio-compra")) || 0
  
      if (!nombreProducto) {
        alert("Por favor, seleccione un producto.")
        return
      }
  
      if (cantidad < 1) {
        alert("La cantidad debe ser mayor a 0.")
        return
      }
  
      if (precio <= 0) {
        alert("El precio debe ser mayor a 0.")
        return
      }
  
      // Verificar disponibilidad en inventario
      try {
        const datos = JSON.parse(localStorage.getItem("tiendaCelulares") || "{}")
        const inventario = datos.inventario || []
  
        const productoInventario = inventario.find((p) => p.codigo === codigoProducto)
  
        if (productoInventario && productoInventario.cantidad < cantidad) {
          alert(`No hay suficiente stock. Disponible: ${productoInventario.cantidad}`)
          return
        }
  
        // Agregar producto a la tabla
        const tbody = document.getElementById("cuerpoTablaProductosFactura")
        const index = tbody.querySelectorAll("tr").length
  
        const tr = document.createElement("tr")
        tr.setAttribute("data-index", index)
        tr.setAttribute("data-codigo", codigoProducto)
        tr.setAttribute("data-precio-compra", precioCompra)
  
        const subtotal = (cantidad * precio).toFixed(2)
  
        tr.innerHTML = `
          <td>${nombreProducto}</td>
          <td>
            <input type="number" class="cantidad-producto" value="${cantidad}" min="1" 
                   onchange="actualizarCantidadProducto(this, ${index})" style="width: 60px;">
          </td>
          <td>
            <input type="number" class="precio-producto" value="${precio.toFixed(2)}" step="0.01" 
                   onchange="actualizarPrecioProducto(this, ${index})" style="width: 80px;">
          </td>
          <td>$${subtotal}</td>
          <td>
            <button type="button" class="btn-eliminar-producto" onclick="eliminarProductoFactura(${index})">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        `
  
        tbody.appendChild(tr)
  
        // Actualizar totales
        actualizarTotalesFactura()
  
        // Cerrar modal de agregar producto
        document.getElementById("modalAgregarProducto").style.display = "none"
      } catch (error) {
        console.error("Error al agregar producto a la factura:", error)
        alert("Error al agregar producto: " + error.message)
      }
    }
  
    // Función para guardar los cambios de la factura
    function guardarCambiosFactura() {
      try {
        const idFactura = document.getElementById("editarIdFactura").value
        const cliente = document.getElementById("editarClienteFactura").value
        const tipoFactura = document.getElementById("editarTipoFactura").value
  
        if (!cliente) {
          alert("Por favor, ingrese el nombre del cliente.")
          return
        }
  
        // Obtener productos de la tabla
        const filas = document.querySelectorAll("#cuerpoTablaProductosFactura tr")
        if (filas.length === 0) {
          alert("La factura debe tener al menos un producto.")
          return
        }
  
        const productosEditados = []
        let totalFactura = 0
  
        filas.forEach((fila) => {
          const nombreProducto = fila.cells[0].textContent
          const cantidad = Number.parseInt(fila.querySelector(".cantidad-producto").value) || 0
          const precio = Number.parseFloat(fila.querySelector(".precio-producto").value) || 0
          const codigoProducto = fila.getAttribute("data-codigo")
          const precioCompra = Number.parseFloat(fila.getAttribute("data-precio-compra")) || 0
  
          if (cantidad <= 0 || precio <= 0) {
            throw new Error("La cantidad y el precio deben ser mayores a 0.")
          }
  
          const subtotal = cantidad * precio
          totalFactura += subtotal
  
          productosEditados.push({
            nombre: nombreProducto,
            cantidad: cantidad,
            precio: precio,
            subtotal: subtotal,
            codigo: codigoProducto,
            precioCompra: precioCompra,
          })
        })
  
        // Obtener datos actuales
        const datos = JSON.parse(localStorage.getItem("tiendaCelulares") || "{}")
  
        if (!datos.facturas || !Array.isArray(datos.facturas)) {
          alert("No se encontraron facturas para editar.")
          return
        }
  
        // Buscar la factura por ID
        const facturaIndex = datos.facturas.findIndex((f) => f.id === idFactura)
  
        if (facturaIndex === -1) {
          alert("No se encontró la factura especificada.")
          return
        }
  
        // Actualizar inventario
        actualizarInventario(datos, productosOriginales, productosEditados)
  
        // Actualizar ganancias y capital
        actualizarGananciasYCapital(datos, facturaOriginal, {
          cliente: cliente,
          tipo: tipoFactura,
          total: totalFactura,
          productos: productosEditados,
        })
  
        // Actualizar factura
        datos.facturas[facturaIndex].cliente = cliente
        datos.facturas[facturaIndex].tipo = tipoFactura
        datos.facturas[facturaIndex].total = totalFactura
        datos.facturas[facturaIndex].productos = productosEditados
  
        // Si el tipo cambió de crédito a contado, actualizar cuentas por cobrar
        if (facturaOriginal.tipo === "credito" && tipoFactura === "contado") {
          actualizarCuentasPorCobrar(datos, idFactura)
        }
  
        // Guardar cambios
        localStorage.setItem("tiendaCelulares", JSON.stringify(datos))
  
        // Si existe la función de guardar en Firebase, llamarla
        if (typeof window.guardarCambiosEnFirebase === "function") {
          window.guardarCambiosEnFirebase()
        }
  
        // Cerrar modal
        document.getElementById("modalEditarFactura").style.display = "none"
  
        // Actualizar la tabla de registros
        if (typeof window.cargarRegistros === "function") {
          window.cargarRegistros()
        } else {
          // Recargar la página como alternativa
          location.reload()
        }
  
        // Mostrar mensaje de éxito
        alert("Factura actualizada correctamente.")
      } catch (error) {
        console.error("Error al guardar cambios de factura:", error)
        alert("Error al guardar cambios: " + error.message)
      }
    }
  
    // Función para actualizar el inventario
    function actualizarInventario(datos, productosOriginales, productosEditados) {
      if (!datos.inventario || !Array.isArray(datos.inventario)) {
        console.error("No se encontró inventario para actualizar.")
        return
      }
  
      // Primero devolver al inventario los productos originales
      productosOriginales.forEach((productoOriginal) => {
        if (!productoOriginal.codigo) return
  
        const productoInventario = datos.inventario.find((p) => p.codigo === productoOriginal.codigo)
        if (productoInventario) {
          productoInventario.cantidad += productoOriginal.cantidad
        }
      })
  
      // Luego restar del inventario los productos editados
      productosEditados.forEach((productoEditado) => {
        if (!productoEditado.codigo) return
  
        const productoInventario = datos.inventario.find((p) => p.codigo === productoEditado.codigo)
        if (productoInventario) {
          if (productoInventario.cantidad < productoEditado.cantidad) {
            throw new Error(
              `No hay suficiente stock de ${productoEditado.nombre}. Disponible: ${productoInventario.cantidad}`,
            )
          }
          productoInventario.cantidad -= productoEditado.cantidad
        }
      })
    }
  
    // Función para actualizar ganancias y capital
    function actualizarGananciasYCapital(datos, facturaOriginal, facturaEditada) {
      // Calcular ganancia original
      let gananciaOriginal = 0
      facturaOriginal.productos.forEach((producto) => {
        gananciaOriginal += (producto.precio - producto.precioCompra) * producto.cantidad
      })
  
      // Calcular nueva ganancia
      let nuevaGanancia = 0
      facturaEditada.productos.forEach((producto) => {
        nuevaGanancia += (producto.precio - producto.precioCompra) * producto.cantidad
      })
  
      // Ajustar ganancias
      if (!datos.ganancias) datos.ganancias = 0
      datos.ganancias = datos.ganancias - gananciaOriginal + nuevaGanancia
  
      // Ajustar capital
      if (!datos.capital) datos.capital = { productos: 0, efectivo: 0, banco: 0 }
  
      // Si la factura original era de contado, restar del efectivo
      if (facturaOriginal.tipo === "contado") {
        datos.capital.efectivo -= facturaOriginal.total
      }
  
      // Si la nueva factura es de contado, sumar al efectivo
      if (facturaEditada.tipo === "contado") {
        datos.capital.efectivo += facturaEditada.total
      }
  
      // Ajustar capital en productos
      let valorProductosOriginales = 0
      facturaOriginal.productos.forEach((producto) => {
        valorProductosOriginales += producto.precioCompra * producto.cantidad
      })
  
      let valorProductosEditados = 0
      facturaEditada.productos.forEach((producto) => {
        valorProductosEditados += producto.precioCompra * producto.cantidad
      })
  
      datos.capital.productos = datos.capital.productos + valorProductosOriginales - valorProductosEditados
    }
  
    // Función para actualizar cuentas por cobrar
    function actualizarCuentasPorCobrar(datos, idFactura) {
      if (!datos.cuentasCobrar || !Array.isArray(datos.cuentasCobrar)) return
  
      const cuentaIndex = datos.cuentasCobrar.findIndex((c) => c.facturaId === idFactura)
      if (cuentaIndex !== -1) {
        // Eliminar la cuenta por cobrar
        datos.cuentasCobrar.splice(cuentaIndex, 1)
      }
    }
  
    // Agregar una función alternativa para obtener el ID de la factura
    function obtenerIdFacturaAlternativo(fila) {
      try {
        // Intentar obtener el ID de la factura de diferentes maneras
  
        // Método 1: Buscar en atributos data-*
        const idFactura = fila.getAttribute("data-id") || fila.getAttribute("data-factura-id")
        if (idFactura) return idFactura
  
        // Método 2: Buscar en el contenido de la primera celda (a veces contiene el ID o número de factura)
        const primeraCelda = fila.querySelector("td:first-child")
        if (primeraCelda) {
          const textoFactura = primeraCelda.textContent.trim()
          // Si parece un ID (alfanumérico sin espacios)
          if (/^[a-zA-Z0-9_-]+$/.test(textoFactura)) {
            return textoFactura
          }
        }
  
        // Método 3: Buscar en cualquier botón que tenga un onclick con un patrón similar a mostrarDetalles(id)
        const botones = fila.querySelectorAll("button")
        for (let i = 0; i < botones.length; i++) {
          const onclick = botones[i].getAttribute("onclick") || ""
          // Buscar patrones comunes de funciones que reciben un ID
          const patterns = [
            /\w+$$['"]([^'"]+)['"]$$/, // función("id")
            /\w+$$this,\s*['"]([^'"]+)['"]$$/, // función(this, "id")
          ]
  
          for (const pattern of patterns) {
            const match = onclick.match(pattern)
            if (match && match[1]) {
              return match[1]
            }
          }
        }
  
        // Método 4: Generar un ID basado en la fecha y hora actual (último recurso)
        return "factura_" + Date.now() + "_" + Math.floor(Math.random() * 1000)
      } catch (error) {
        console.error("Error al obtener ID alternativo:", error)
        return "factura_" + Date.now() // ID de respaldo
      }
    }
  
    console.log("Sistema de edición de facturas avanzado con depuración inicializado")
  })()
  
  