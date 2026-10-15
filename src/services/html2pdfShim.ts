const html2pdfShim = () => {
  if (typeof window !== 'undefined' && (window as any).html2pdf) return (window as any).html2pdf();
  return {
    set: () => ({
      from: (_element: HTMLElement) => ({
        save: async () => { if (typeof window !== 'undefined') window.print(); }
      })
    })
  };
};
export default html2pdfShim;
