import { useState } from 'react';
import { useToast } from './use-toast';
import type { Order } from '@shared/schema';

export function useBluetoothPrinter() {
  const [device, setDevice] = useState<any | null>(null);
  const [server, setServer] = useState<any | null>(null);
  const [characteristic, setCharacteristic] = useState<any | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const connect = async () => {
    try {
      setIsConnecting(true);
      // Request standard ESC/POS printer Bluetooth service (18f0 is a common custom service for printers)
      // Some printers use generic serial port profile UUIDs like "00001101-0000-1000-8000-00805f9b34fb" but Web Bluetooth doesn't support SPP out of the box in all browsers natively. 
      // Common WebBLE receipt printers usually expose an open custom service.
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2'] 
      });

      const server = await device.gatt?.connect();
      if (!server) throw new Error("Could not connect to GATT Server");

      const services = await server.getPrimaryServices();
      let printChar = null;

      // Find the first writable characteristic
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            printChar = char;
            break;
          }
        }
        if (printChar) break;
      }

      if (!printChar) {
        throw new Error("Could not find writable printer characteristic");
      }

      setDevice(device);
      setServer(server);
      setCharacteristic(printChar);
      toast({ title: `Connected to ${device.name || 'Printer'}` });
      return printChar;
    } catch (err: any) {
      console.error(err);
      toast({ title: "Connection Failed", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  const padRight = (text: string, length: number) => {
    if (text.length >= length) return text.substring(0, length);
    return text + ' '.repeat(length - text.length);
  };

  const padLeft = (text: string, length: number) => {
    if (text.length >= length) return text.substring(0, length);
    return ' '.repeat(length - text.length) + text;
  };

  const getEscPosBytes = (order: Order) => {
    const HW = 32; // Assuming 58mm printer with 32 chars width
    let output = '';

    // Initialize
    output += '\x1B\x40'; 
    
    // Header
    output += '\x1B\x61\x01'; // Center alignment
    output += '\x1D\x21\x11'; // Double width/height
    output += 'INVOICE\n'; // Company Name
    output += '\x1D\x21\x00'; // Normal text
    output += `Order #${order.id}\n`;
    output += `Date: ${new Date((order as any).date).toLocaleString()}\n`;
    output += `Customer: ${order.customer?.name || 'Walk-in Shop'}\n`;
    output += '--------------------------------\n';
    
    // Items Header
    output += '\x1B\x61\x00'; // Left align
    output += padRight('Item', 16) + padLeft('Qty', 6) + padLeft('Amt', 10) + '\n';
    output += '--------------------------------\n';

    // Items
    let total = 0;
    order.items?.forEach(item => {
      const name = padRight(item.product?.name || 'Product', 16);
      const qty = padLeft(item.quantity.toString(), 6);
      const amt = item.isFree ? padLeft('FREE', 10) : padLeft(`Rs${(item.product?.price || 0) * item.quantity}`, 10);
      output += `${name}${qty}${amt}\n`;
      if (!item.isFree) total += (item.product?.price || 0) * item.quantity;
    });

    // Total
    output += '--------------------------------\n';
    output += '\x1D\x21\x01'; // Double height
    output += padRight('TOTAL:', 16) + padLeft(`Rs ${total}`, 16) + '\n';
    output += '\x1D\x21\x00'; // Normal text
    output += `Paid via: ${order.paymentMode}\n`;
    output += '\n\n';
    
    // Footer
    output += '\x1B\x61\x01'; // Center align
    output += 'Thank you for your business!\n';
    output += '\n\n\n'; // Feed paper
    
    return new TextEncoder().encode(output);
  };

  const sendPrintData = async (char: any, data: Uint8Array) => {
    const maxChunk = 512;
    let offset = 0;
    while (offset < data.length) {
      const chunk = data.slice(offset, offset + maxChunk);
      await char.writeValue(chunk);
      offset += maxChunk;
    }
  };

  const printReceipt = async (order: Order) => {
    try {
      let char = characteristic;
      if (!char || !server?.connected) {
        char = await connect();
        if (!char) return;
      }
      
      const bytes = getEscPosBytes(order);
      await sendPrintData(char, bytes);
      toast({ title: "Printing complete!" });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Print Failed", description: err.message, variant: "destructive" });
    }
  };

  return {
    connect,
    printReceipt,
    isConnecting,
    isConnected: !!server?.connected
  };
}
