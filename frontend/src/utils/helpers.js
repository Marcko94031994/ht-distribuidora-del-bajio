export const pesos = (n) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(n || 0);

export const pesosDecimals = (n) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);

export const imgUrl = (path) => { if (!path) return ''; if (path.startsWith('data:image')) return path; return path; };

export const printRemision = (pedido, currentCliente, currentItems, data) => {
  const getProd = (id) => data.productos?.find(p => p.id === id) || {};
  const driver = data.vendedores?.find(v => v.id === pedido.driverId) || {};
  const vendedorName = driver.name || 'N/A';
  
  const today = new Date().toLocaleDateString('es-MX');
  const vencimiento = new Date(new Date().setDate(new Date().getDate() + (currentCliente?.creditDays || 1))).toLocaleDateString('es-MX');
  
  let rowsHtml = '';
  let total = 0;
  
  currentItems.forEach(i => {
    const p = getProd(i.productId);
    const price = p.price || 0;
    const sub = price * i.quantity;
    total += sub;
    rowsHtml += `
      <tr>
        <td style="text-align: center;">${p.barcode || p.id}</td>
        <td style="text-align: right;">${i.quantity}</td>
        <td style="text-align: center;">PZA</td>
        <td>${p.name || ''}</td>
        <td style="text-align: right;">${pesosDecimals(price)}</td>
        <td style="text-align: right;">${pesosDecimals(sub)}</td>
      </tr>
    `;
  });

  const html = `
    <html>
      <head>
        <title>Remisión ${pedido.orderNumber || pedido.id}</title>
        <style>
          body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; color: #000; font-size: 11px; }
          .header { display: flex; justify-content: space-between; border: 1px solid #000; }
          .header-left { width: 25%; text-align: center; padding: 10px; border-right: 1px solid #000; }
          .header-left h1 { margin: 0; font-size: 30px; color: #dc2626; line-height: 1; font-family: 'Times New Roman', serif; }
          .header-left h2 { margin: 2px 0 0; font-size: 12px; }
          .header-left p { margin: 0; font-size: 9px; color: #dc2626; }
          .header-center { width: 50%; text-align: center; padding: 10px; }
          .header-center h1 { margin: 0 0 5px; font-size: 20px; }
          .header-center p { margin: 2px 0; font-size: 11px; }
          .header-right { width: 25%; padding: 0; border-left: 1px solid #000; display: flex; flex-direction: column; }
          .hr-top { padding: 10px; border-bottom: 1px solid #000; text-align: center; font-size: 14px; font-weight: bold; flex: 1; }
          .hr-mid { padding: 5px 10px; border-bottom: 1px solid #000; display: flex; justify-content: space-between; }
          .hr-bot { padding: 5px 10px; display: flex; justify-content: space-between; }
          
          .client-box { border: 1px solid #000; border-top: none; padding: 5px 10px; display: flex; justify-content: space-between; }
          .cb-col { display: flex; flex-direction: column; gap: 4px; width: 65%; }
          .cb-col2 { display: flex; flex-direction: column; gap: 4px; width: 35%; border-left: 1px solid #000; padding-left: 10px; }
          
          .table { width: 100%; border-collapse: collapse; margin-top: 5px; }
          .table th { border-bottom: 1px solid #000; border-top: 1px solid #000; text-align: left; padding: 4px; font-weight: normal; }
          .table td { padding: 4px; }
          
          .totals { display: flex; justify-content: space-between; margin-top: 5px; border-top: 1px solid #000; }
          .obs { width: 60%; border: 1px solid #000; border-top: none; padding: 5px; min-height: 40px; }
          .tot { width: 38%; border: 1px solid #000; border-top: none; padding: 5px; text-align: right; }
          
          .pagare { margin-top: 20px; border: 1px dashed #000; padding: 10px; font-size: 10px; text-align: justify; line-height: 1.3; }
          .firma { margin-top: 30px; text-align: left; }
          
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <h1>HT</h1>
            <h2>DISTRIBUIDORA</h2>
            <p>DEL BAJIO</p>
          </div>
          <div class="header-center">
            <h1>HT Distribuidora del Bajío</h1>
            <p>Correo : htdistribuidoradelbajio05@gmail.com</p>
            <p>Oficina : 477 978 70 63</p>
          </div>
          <div class="header-right">
            <div class="hr-top">Remisión : ${pedido.orderNumber || pedido.id}</div>
            <div class="hr-mid"><span>Fecha :</span> <b>${today}</b></div>
          </div>
        </div>
        
        <div class="client-box">
          <div class="cb-col">
            <div>Cliente : <b>${currentCliente?.name || ''} ( ${currentCliente?.id || ''} )</b></div>
            <div>Domicilio : <b>${currentCliente?.address || currentCliente?.zone || ''}</b></div>
            <div style="display:flex; justify-content:space-between; padding-right:10px;"><span>Le Atendio : <b>${vendedorName}</b></span> <span>Su Cel : <b>${driver.phone || ''}</b></span></div>
          </div>
          <div class="cb-col2">
            <div>Días de Plazo <b>${currentCliente?.creditDays || 1}</b></div>
            <div>Fcha. Vence : <b>${vencimiento}</b></div>
            <div style="text-align: center; font-size: 16px; font-weight: bold; letter-spacing: 3px; margin-top: 5px;">O R I G I N A L</div>
          </div>
        </div>
        
        <table class="table">
          <thead>
            <tr>
              <th style="text-align: center;">Codigo</th>
              <th style="text-align: right;">Cantidad</th>
              <th style="text-align: center;">Unidad</th>
              <th>D e s c r i p c i o n</th>
              <th style="text-align: right;">Precio</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        
        <div class="totals">
          <div class="obs">Obs : <br/>${pedido.notes || 'NOTA'}</div>
          <div class="tot">
            <b>Total $ &nbsp;&nbsp;&nbsp;&nbsp; ${pesosDecimals(total)}</b>
            <div style="font-size: 9px; margin-top: 5px;">(${total} M.N.)</div>
          </div>
        </div>
        
        <div class="pagare">
          Por el presente pagaré reconozco(emos) deber y me(nos) obligo(amos) a pagar en esta ciudad o en cualquier otra en que se 
          me(nos) requiera de pago a MARCO AXEL HERNANDEZ TORRES o a su orden el día de su vencimiento ${vencimiento}, 
          la cantidad de ${pesosDecimals(total)}. Valor recibido a mi(nuestra) entera satisfacción.
          En caso de incumplimiento la cantidad consignada generará interes moratorios a razón de un 6% mensual.<br/><br/>
          Otorgante: &nbsp;&nbsp; ${currentCliente?.name || ''} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Al ${today}<br/>
          Firma____________________
        </div>
        
        <div style="text-align: right; font-size: 9px; margin-top: 5px;">Remisiones-PAGA</div>
        
        <script>
          setTimeout(() => { window.print(); }, 500);
        </script>
      </body>
    </html>
  `;
  
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
};
