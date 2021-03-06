import { Diagnostic } from 'typescript';
export interface ICompilerDiagnostic {
    filename?: string;
    line?: number;
    character?: number;
    lineText?: string;
    message: string;
    originalMessage: string;
    originalDiagnostic: Diagnostic;
}
//# sourceMappingURL=ICompilerDiagnostic.d.ts.map