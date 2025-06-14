export function parseCSV(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(header => 
        header.trim().replace(/^"(.+)"$/, '$1')
      );
      
      const data = lines.slice(1).filter(line => line.trim()).map(line => {
        const values = line.split(',').map(value => 
          value.trim().replace(/^"(.+)"$/, '$1')
        );
        return headers.reduce((obj, header, index) => {
          obj[header] = values[index];
          return obj;
        }, {} as any);
      });
      
      resolve(data);
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}