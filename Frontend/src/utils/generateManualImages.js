/**
 * Script to generate placeholder images for the Admin Reports User Manual
 * Uses Canvas API to create mockup screenshots
 * 
 * To use: Run this in a browser environment or Node.js with canvas support
 */

export const generateManualImages = () => {
  const images = [
    {
      filename: 'sidebar-access.png',
      width: 300,
      height: 600,
      content: (ctx, width, height) => {
        // Sidebar background
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, width, height);
        
        // Menu items
        const menuItems = [
          { icon: '📊', text: 'Dashboard', active: false },
          { icon: '📦', text: 'Orders', active: false },
          { icon: '👥', text: 'Customers', active: false },
          { icon: '📈', text: 'Admin Reports', active: true },
          { icon: '⚙️', text: 'Settings', active: false },
        ];
        
        menuItems.forEach((item, index) => {
          const y = 100 + index * 70;
          
          if (item.active) {
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(0, y - 5, width, 60);
          }
          
          // Icon
          ctx.font = '24px Arial';
          ctx.fillText(item.icon, 20, y + 25);
          
          // Text
          ctx.fillStyle = item.active ? '#ffffff' : '#94a3b8';
          ctx.font = '16px Arial';
          ctx.fillText(item.text, 60, y + 25);
        });
      }
    },
    {
      filename: 'page-header.png',
      width: 1200,
      height: 100,
      content: (ctx, width, height) => {
        // Background
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, width, height);
        
        // Title
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('Admin Reports', 20, 40);
        
        // Buttons
        const buttons = [
          { text: 'Export CSV', x: 800, color: '#10b981' },
          { text: 'Export PDF', x: 920, color: '#ef4444' },
          { text: 'Save View', x: 1040, color: '#3b82f6' },
        ];
        
        buttons.forEach(btn => {
          ctx.fillStyle = btn.color;
          ctx.fillRect(btn.x, 20, 100, 40);
          ctx.fillStyle = '#ffffff';
          ctx.font = '14px Arial';
          ctx.fillText(btn.text, btn.x + 10, 45);
        });
      }
    },
    {
      filename: 'filters-card.png',
      width: 1200,
      height: 200,
      content: (ctx, width, height) => {
        // Card background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, width, height);
        
        // Title
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('Filters', 20, 40);
        
        // Date presets
        const presets = ['Today', 'Week', 'Month', 'Quarter', 'Custom'];
        presets.forEach((preset, index) => {
          const x = 20 + index * 120;
          const isActive = preset === 'Month';
          
          ctx.fillStyle = isActive ? '#3b82f6' : '#e2e8f0';
          ctx.fillRect(x, 60, 100, 35);
          
          ctx.fillStyle = isActive ? '#ffffff' : '#64748b';
          ctx.font = '14px Arial';
          ctx.fillText(preset, x + 10, 83);
        });
        
        // Date inputs
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(20, 120, 200, 40);
        ctx.fillRect(240, 120, 200, 40);
        
        ctx.fillStyle = '#64748b';
        ctx.font = '14px Arial';
        ctx.fillText('Start: 2026-02-01', 30, 145);
        ctx.fillText('End: 2026-02-28', 250, 145);
        
        // City selector
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(460, 120, 300, 40);
        ctx.fillStyle = '#64748b';
        ctx.fillText('Cities: All locations', 470, 145);
      }
    },
    {
      filename: 'historical-card.png',
      width: 1200,
      height: 180,
      content: (ctx, width, height) => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#e2e8f0';
        ctx.strokeRect(0, 0, width, height);
        
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('Historical Data', 20, 40);
        
        // Mode selector
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(20, 60, 200, 40);
        ctx.fillStyle = '#64748b';
        ctx.font = '14px Arial';
        ctx.fillText('Mode: Current', 30, 85);
        
        // Archive button
        ctx.fillStyle = '#8b5cf6';
        ctx.fillRect(240, 60, 150, 40);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Archive Season', 250, 85);
        
        // Info text
        ctx.fillStyle = '#64748b';
        ctx.font = '13px Arial';
        ctx.fillText('Switch to Historical or Compare mode to view archived seasons', 20, 130);
      }
    },
    {
      filename: 'date-filters.png',
      width: 800,
      height: 150,
      content: (ctx, width, height) => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        // Preset buttons
        const presets = ['Today', 'Week', 'Month', 'Quarter', 'Custom'];
        presets.forEach((preset, index) => {
          const x = 20 + index * 130;
          ctx.fillStyle = preset === 'Month' ? '#3b82f6' : '#e2e8f0';
          ctx.fillRect(x, 20, 110, 40);
          
          ctx.fillStyle = preset === 'Month' ? '#ffffff' : '#64748b';
          ctx.font = '14px Arial';
          ctx.fillText(preset, x + 20, 45);
        });
        
        // Custom date inputs
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(20, 80, 180, 40);
        ctx.fillRect(220, 80, 180, 40);
        
        ctx.fillStyle = '#64748b';
        ctx.fillText('2026-02-01', 30, 105);
        ctx.fillText('2026-02-28', 230, 105);
      }
    },
    {
      filename: 'export-buttons.png',
      width: 400,
      height: 60,
      content: (ctx, width, height) => {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, width, height);
        
        // Export CSV
        ctx.fillStyle = '#10b981';
        ctx.fillRect(10, 10, 110, 40);
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.fillText('📊 Export CSV', 20, 35);
        
        // Export PDF
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(140, 10, 110, 40);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('📄 Export PDF', 150, 35);
        
        // Save View
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(270, 10, 110, 40);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('💾 Save View', 280, 35);
      }
    },
    {
      filename: 'historical-mode.png',
      width: 900,
      height: 200,
      content: (ctx, width, height) => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('Report Mode', 20, 30);
        
        // Mode buttons
        const modes = ['Current', 'Historical', 'Compare'];
        modes.forEach((mode, index) => {
          const x = 20 + index * 150;
          ctx.fillStyle = mode === 'Historical' ? '#8b5cf6' : '#e2e8f0';
          ctx.fillRect(x, 50, 130, 40);
          
          ctx.fillStyle = mode === 'Historical' ? '#ffffff' : '#64748b';
          ctx.font = '14px Arial';
          ctx.fillText(mode, x + 20, 75);
        });
        
        // Season selector
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(20, 120, 250, 40);
        ctx.fillStyle = '#64748b';
        ctx.fillText('Season: Q1 2026', 30, 145);
        
        // Info banner
        ctx.fillStyle = '#dbeafe';
        ctx.fillRect(300, 120, 580, 40);
        ctx.fillStyle = '#1e40af';
        ctx.font = '13px Arial';
        ctx.fillText('Viewing historical data: 1,234 kg, 12,340 pouches, €15,680 revenue', 310, 145);
      }
    },
    {
      filename: 'overview-kpis.png',
      width: 1200,
      height: 200,
      content: (ctx, width, height) => {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, width, height);
        
        const kpis = [
          { title: 'Total Kilos', value: '1,234 kg', color: '#3b82f6' },
          { title: 'Pouches', value: '12,340', color: '#10b981' },
          { title: 'Revenue', value: '€15,680', color: '#f59e0b' },
          { title: 'Gross Profit', value: '€8,920', color: '#8b5cf6' },
          { title: 'Net Profit', value: '€6,450', color: '#ef4444' },
          { title: 'Yield', value: '98.5%', color: '#06b6d4' },
        ];
        
        kpis.forEach((kpi, index) => {
          const x = 20 + (index % 3) * 390;
          const y = 20 + Math.floor(index / 3) * 90;
          
          // Card
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y, 370, 70);
          ctx.strokeStyle = '#e2e8f0';
          ctx.strokeRect(x, y, 370, 70);
          
          // Color indicator
          ctx.fillStyle = kpi.color;
          ctx.fillRect(x, y, 5, 70);
          
          // Title
          ctx.fillStyle = '#64748b';
          ctx.font = '13px Arial';
          ctx.fillText(kpi.title, x + 15, y + 25);
          
          // Value
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 20px Arial';
          ctx.fillText(kpi.value, x + 15, y + 52);
        });
      }
    },
    {
      filename: 'overview-charts.png',
      width: 1200,
      height: 400,
      content: (ctx, width, height) => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        // Production vs Sales chart
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('Production vs Sales', 20, 30);
        
        // Line chart simulation
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(50, 150);
        ctx.lineTo(150, 120);
        ctx.lineTo(250, 100);
        ctx.lineTo(350, 110);
        ctx.lineTo(450, 80);
        ctx.stroke();
        
        ctx.strokeStyle = '#10b981';
        ctx.beginPath();
        ctx.moveTo(50, 160);
        ctx.lineTo(150, 135);
        ctx.lineTo(250, 115);
        ctx.lineTo(350, 125);
        ctx.lineTo(450, 95);
        ctx.stroke();
        
        // Performance by City chart
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('Performance by City', 650, 30);
        
        // Bar chart simulation
        const cities = ['Helsinki', 'Espoo', 'Tampere', 'Turku'];
        cities.forEach((city, index) => {
          const x = 650 + index * 130;
          const barHeight = 50 + Math.random() * 100;
          
          ctx.fillStyle = '#8b5cf6';
          ctx.fillRect(x, 200 - barHeight, 80, barHeight);
          
          ctx.fillStyle = '#64748b';
          ctx.font = '12px Arial';
          ctx.fillText(city, x, 220);
        });
      }
    },
    {
      filename: 'cost-centers.png',
      width: 1200,
      height: 300,
      content: (ctx, width, height) => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('Cost Centers', 20, 30);
        
        // Summary chips
        const totals = [
          { label: 'Direct Costs', value: '€4,560', color: '#ef4444' },
          { label: 'Overhead', value: '€2,460', color: '#f59e0b' },
          { label: 'Total', value: '€7,020', color: '#3b82f6' },
        ];
        
        totals.forEach((total, index) => {
          const x = 20 + index * 200;
          ctx.fillStyle = total.color;
          ctx.fillRect(x, 50, 180, 40);
          
          ctx.fillStyle = '#ffffff';
          ctx.font = '13px Arial';
          ctx.fillText(total.label, x + 10, 70);
          ctx.font = 'bold 16px Arial';
          ctx.fillText(total.value, x + 10, 85);
        });
        
        // Table header
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(20, 120, 1160, 40);
        
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('Name', 30, 145);
        ctx.fillText('Category', 300, 145);
        ctx.fillText('Description', 500, 145);
        ctx.fillText('Actions', 1050, 145);
        
        // Table rows
        const costCenters = [
          { name: 'Raw Materials', category: 'Direct', desc: 'Juice concentrate, packaging' },
          { name: 'Labor', category: 'Direct', desc: 'Production staff wages' },
          { name: 'Utilities', category: 'Overhead', desc: 'Electricity, water' },
        ];
        
        costCenters.forEach((center, index) => {
          const y = 180 + index * 40;
          
          ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#f8fafc';
          ctx.fillRect(20, y - 20, 1160, 40);
          
          ctx.fillStyle = '#0f172a';
          ctx.font = '14px Arial';
          ctx.fillText(center.name, 30, y);
          
          ctx.fillStyle = center.category === 'Direct' ? '#ef4444' : '#f59e0b';
          ctx.fillRect(300, y - 15, 80, 25);
          ctx.fillStyle = '#ffffff';
          ctx.font = '12px Arial';
          ctx.fillText(center.category, 310, y);
          
          ctx.fillStyle = '#64748b';
          ctx.font = '14px Arial';
          ctx.fillText(center.desc, 500, y);
          
          // Action buttons
          ctx.fillStyle = '#3b82f6';
          ctx.fillText('✏️', 1050, y);
          ctx.fillStyle = '#ef4444';
          ctx.fillText('🗑️', 1100, y);
        });
      }
    },
    {
      filename: 'cost-entries.png',
      width: 1200,
      height: 300,
      content: (ctx, width, height) => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('Cost Entries', 20, 30);
        
        // Add button
        ctx.fillStyle = '#10b981';
        ctx.fillRect(1050, 10, 130, 35);
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.fillText('+ Add Entry', 1060, 32);
        
        // Table header
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(20, 60, 1160, 40);
        
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('Date', 30, 85);
        ctx.fillText('Cost Center', 200, 85);
        ctx.fillText('Amount', 450, 85);
        ctx.fillText('Notes', 600, 85);
        ctx.fillText('Actions', 1050, 85);
        
        // Table rows
        const entries = [
          { date: '2026-02-15', center: 'Raw Materials', amount: '€1,250', notes: 'Juice concentrate shipment' },
          { date: '2026-02-14', center: 'Labor', amount: '€2,100', notes: 'Weekly payroll' },
          { date: '2026-02-13', center: 'Utilities', amount: '€450', notes: 'Electricity bill' },
        ];
        
        entries.forEach((entry, index) => {
          const y = 120 + index * 40;
          
          ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#f8fafc';
          ctx.fillRect(20, y - 20, 1160, 40);
          
          ctx.fillStyle = '#0f172a';
          ctx.font = '14px Arial';
          ctx.fillText(entry.date, 30, y);
          ctx.fillText(entry.center, 200, y);
          
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 14px Arial';
          ctx.fillText(entry.amount, 450, y);
          
          ctx.fillStyle = '#64748b';
          ctx.font = '14px Arial';
          ctx.fillText(entry.notes, 600, y);
          
          ctx.fillStyle = '#3b82f6';
          ctx.fillText('✏️', 1050, y);
          ctx.fillStyle = '#ef4444';
          ctx.fillText('🗑️', 1100, y);
        });
      }
    },
    {
      filename: 'inventory-summary.png',
      width: 1200,
      height: 250,
      content: (ctx, width, height) => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('Inventory Summary', 20, 30);
        
        // Table
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(20, 60, 1160, 40);
        
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('Item', 30, 85);
        ctx.fillText('On Hand', 400, 85);
        ctx.fillText('Unit', 550, 85);
        ctx.fillText('Unit Cost', 700, 85);
        ctx.fillText('Total Value', 900, 85);
        
        const items = [
          { name: 'Apple Juice Concentrate', qty: '250 L', unit: 'Liter', cost: '€12.50', value: '€3,125' },
          { name: 'Plastic Pouches (500ml)', qty: '5,000', unit: 'Piece', cost: '€0.15', value: '€750' },
          { name: 'Cardboard Boxes', qty: '150', unit: 'Box', cost: '€2.50', value: '€375' },
        ];
        
        items.forEach((item, index) => {
          const y = 120 + index * 40;
          
          ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#f8fafc';
          ctx.fillRect(20, y - 20, 1160, 40);
          
          ctx.fillStyle = '#0f172a';
          ctx.font = '14px Arial';
          ctx.fillText(item.name, 30, y);
          ctx.fillText(item.qty, 400, y);
          ctx.fillText(item.unit, 550, y);
          ctx.fillText(item.cost, 700, y);
          
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 14px Arial';
          ctx.fillText(item.value, 900, y);
        });
      }
    },
    {
      filename: 'inventory-items.png',
      width: 1200,
      height: 200,
      content: (ctx, width, height) => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('Inventory Items', 20, 30);
        
        ctx.fillStyle = '#10b981';
        ctx.fillRect(1050, 10, 130, 35);
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.fillText('+ Add Item', 1065, 32);
        
        const items = [
          'Apple Juice Concentrate - SKU: AJC-001',
          'Plastic Pouches (500ml) - SKU: PP-500',
          'Cardboard Boxes - SKU: CB-STD',
        ];
        
        items.forEach((item, index) => {
          const y = 80 + index * 35;
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(20, y - 25, 1160, 30);
          
          ctx.fillStyle = '#0f172a';
          ctx.font = '14px Arial';
          ctx.fillText('• ' + item, 30, y);
        });
      }
    },
    {
      filename: 'inventory-transactions.png',
      width: 1200,
      height: 250,
      content: (ctx, width, height) => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('Inventory Transactions', 20, 30);
        
        ctx.fillStyle = '#10b981';
        ctx.fillRect(1020, 10, 160, 35);
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.fillText('+ Add Transaction', 1030, 32);
        
        // Table
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(20, 60, 1160, 40);
        
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('Date', 30, 85);
        ctx.fillText('Item', 180, 85);
        ctx.fillText('Type', 450, 85);
        ctx.fillText('Quantity', 600, 85);
        ctx.fillText('Unit Cost', 750, 85);
        ctx.fillText('Actions', 1050, 85);
        
        const transactions = [
          { date: '2026-02-15', item: 'Apple Concentrate', type: 'Purchase', qty: '+100 L', cost: '€12.50' },
          { date: '2026-02-14', item: 'Plastic Pouches', type: 'Usage', qty: '-500', cost: '€0.15' },
          { date: '2026-02-13', item: 'Cardboard Boxes', type: 'Adjustment', qty: '+10', cost: '€2.50' },
        ];
        
        transactions.forEach((tx, index) => {
          const y = 120 + index * 40;
          
          ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#f8fafc';
          ctx.fillRect(20, y - 20, 1160, 40);
          
          ctx.fillStyle = '#0f172a';
          ctx.font = '14px Arial';
          ctx.fillText(tx.date, 30, y);
          ctx.fillText(tx.item, 180, y);
          
          const typeColors = { Purchase: '#10b981', Usage: '#f59e0b', Adjustment: '#8b5cf6' };
          ctx.fillStyle = typeColors[tx.type];
          ctx.fillRect(450, y - 15, 100, 25);
          ctx.fillStyle = '#ffffff';
          ctx.font = '12px Arial';
          ctx.fillText(tx.type, 460, y);
          
          ctx.fillStyle = tx.qty.startsWith('+') ? '#10b981' : '#ef4444';
          ctx.font = 'bold 14px Arial';
          ctx.fillText(tx.qty, 600, y);
          
          ctx.fillStyle = '#0f172a';
          ctx.font = '14px Arial';
          ctx.fillText(tx.cost, 750, y);
        });
      }
    },
    {
      filename: 'auto-transactions.png',
      width: 1200,
      height: 200,
      content: (ctx, width, height) => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('Auto-Generated Transactions', 20, 30);
        
        ctx.fillStyle = '#dbeafe';
        ctx.fillRect(20, 50, 1160, 40);
        ctx.fillStyle = '#1e40af';
        ctx.font = '13px Arial';
        ctx.fillText('ℹ️ These transactions are automatically created from production orders', 30, 75);
        
        const transactions = [
          { date: '2026-02-15', item: 'Plastic Pouches', order: 'ORD-1234', qty: '-500' },
          { date: '2026-02-14', item: 'Apple Concentrate', order: 'ORD-1233', qty: '-25 L' },
        ];
        
        transactions.forEach((tx, index) => {
          const y = 120 + index * 35;
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(20, y - 25, 1160, 30);
          
          ctx.fillStyle = '#0f172a';
          ctx.font = '14px Arial';
          ctx.fillText(`${tx.date} - ${tx.item} - Order ${tx.order}`, 30, y);
          
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 14px Arial';
          ctx.fillText(tx.qty, 600, y);
        });
      }
    },
    {
      filename: 'income-statement.png',
      width: 800,
      height: 400,
      content: (ctx, width, height) => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('Income Statement', 20, 35);
        
        ctx.fillStyle = '#64748b';
        ctx.font = '14px Arial';
        ctx.fillText('Period: February 2026', 20, 60);
        
        // Export button
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(630, 15, 150, 40);
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.fillText('Export Statement', 640, 40);
        
        const lines = [
          { label: 'Revenue', value: '€15,680', indent: 0, bold: false },
          { label: 'Cost of Goods Sold', value: '€6,760', indent: 0, bold: false },
          { label: 'Gross Profit', value: '€8,920', indent: 0, bold: true, line: true },
          { label: 'Operating Expenses', value: '', indent: 0, bold: false },
          { label: 'Overhead Costs', value: '€2,460', indent: 20, bold: false },
          { label: 'Other Expenses', value: '€10', indent: 20, bold: false },
          { label: 'Net Profit', value: '€6,450', indent: 0, bold: true, line: true },
        ];
        
        let y = 110;
        lines.forEach(line => {
          if (line.line) {
            ctx.strokeStyle = '#e2e8f0';
            ctx.beginPath();
            ctx.moveTo(20, y - 10);
            ctx.lineTo(780, y - 10);
            ctx.stroke();
          }
          
          ctx.fillStyle = '#0f172a';
          ctx.font = line.bold ? 'bold 16px Arial' : '14px Arial';
          ctx.fillText(line.label, 20 + line.indent, y);
          
          if (line.value) {
            ctx.fillStyle = line.bold ? (line.value.includes('-') ? '#ef4444' : '#10b981') : '#64748b';
            ctx.fillText(line.value, 680, y);
          }
          
          y += 40;
        });
      }
    },
    {
      filename: 'balance-sheet.png',
      width: 800,
      height: 500,
      content: (ctx, width, height) => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('Balance Sheet', 20, 35);
        
        ctx.fillStyle = '#64748b';
        ctx.font = '14px Arial';
        ctx.fillText('As of: February 28, 2026', 20, 60);
        
        // Export button
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(630, 15, 150, 40);
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.fillText('Export Statement', 640, 40);
        
        const sections = [
          { title: 'ASSETS', items: [
            { label: 'Current Assets', value: '' },
            { label: 'Cash', value: '€12,500', indent: 20 },
            { label: 'Inventory', value: '€4,250', indent: 20 },
            { label: 'Total Assets', value: '€16,750', bold: true },
          ]},
          { title: 'LIABILITIES', items: [
            { label: 'Current Liabilities', value: '' },
            { label: 'Accounts Payable', value: '€3,200', indent: 20 },
            { label: 'Total Liabilities', value: '€3,200', bold: true },
          ]},
          { title: 'EQUITY', items: [
            { label: 'Retained Earnings', value: '€13,550', indent: 0 },
            { label: 'Total Equity', value: '€13,550', bold: true },
          ]},
        ];
        
        let y = 100;
        sections.forEach(section => {
          ctx.fillStyle = '#64748b';
          ctx.font = 'bold 14px Arial';
          ctx.fillText(section.title, 20, y);
          y += 30;
          
          section.items.forEach(item => {
            ctx.fillStyle = '#0f172a';
            ctx.font = item.bold ? 'bold 16px Arial' : '14px Arial';
            ctx.fillText(item.label, 20 + (item.indent || 0), y);
            
            if (item.value) {
              ctx.fillText(item.value, 680, y);
            }
            
            y += 35;
          });
          
          y += 20;
        });
      }
    },
  ];
  
  return images;
};

/**
 * Downloads all generated images
 * Call this function in a browser context
 */
export const downloadAllManualImages = () => {
  const images = generateManualImages();
  
  images.forEach(imageSpec => {
    const canvas = document.createElement('canvas');
    canvas.width = imageSpec.width;
    canvas.height = imageSpec.height;
    const ctx = canvas.getContext('2d');
    
    // Generate the image content
    imageSpec.content(ctx, imageSpec.width, imageSpec.height);
    
    // Download
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = imageSpec.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  });
};
