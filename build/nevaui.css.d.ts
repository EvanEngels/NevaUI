// TypeScript refuses a side-effect import it has no declaration for, so shipping the
// stylesheet without this makes `import 'nevaui/styles.css'` an error in any typed
// project (TS2882). The file is empty on purpose: the stylesheet exports nothing.
export {};
