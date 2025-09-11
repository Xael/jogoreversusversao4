// js/ui/dom.js

// This file acts as a redirector to fix incorrect import paths.
// It ensures any module trying to load 'dom.js' from within the 'ui' directory
// gets the correct module from the 'core' directory.
import { elements, initDom } from '../core/dom.js';

// Re-export the new structure.
export { elements, initDom };
