// Shared between main and renderer via import — safe as string constants only.
export const IPC = {
  PROJECT_OPEN: 'project:open',
  PROJECT_SAVE: 'project:save',
  PROJECT_SAVE_AS: 'project:saveAs',
  PROJECT_EXPORT_JSON: 'project:export-json',
  PROJECT_EXPORT_XML: 'project:export-xml',
  PROJECT_IMPORT_JSON: 'project:import-json',
  PROJECT_IMPORT_XML: 'project:import-xml',
  ASSET_IMPORT: 'asset:import',
  ASSET_GET_PATH: 'asset:get-path',
  DIALOG_CONFIRM: 'dialog:show-confirm',

  MENU_NEW: 'menu:new',
  MENU_OPEN: 'menu:open',
  MENU_SAVE: 'menu:save',
  MENU_SAVE_AS: 'menu:saveAs',
  MENU_UNDO: 'menu:undo',
  MENU_REDO: 'menu:redo'
} as const
