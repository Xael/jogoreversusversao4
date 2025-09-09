// Este arquivo atua como um redirecionador para corrigir um caminho de importação incorreto.
// Ele garante que qualquer módulo que tente carregar 'dom.js' de dentro do diretório 'ui'
// obtenha o módulo correto do diretório 'core'.
export * from '../core/dom.js';
