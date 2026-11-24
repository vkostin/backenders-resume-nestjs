declare module 'pdfmake' {
  interface PdfDocument {
    getBuffer(): Promise<Buffer>;
    getBase64(): Promise<string>;
  }
  interface PdfmakeInstance {
    addFonts(fonts: Record<string, unknown>): void;
    setLocalAccessPolicy(callback: (path: string) => boolean): void;
    setUrlAccessPolicy(callback: (url: string) => boolean): void;
    createPdf(docDefinition: unknown): PdfDocument;
  }
  const pdfmake: PdfmakeInstance;
  export default pdfmake;
}

declare module 'pdfmake/fonts/Roboto' {
  const Roboto: Record<string, Record<string, string>>;
  export default Roboto;
}
