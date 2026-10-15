import { app, Menu, type MenuItemConstructorOptions } from 'electron'
import { APP_NAME } from '../shared/appInfo'

/** Programmenyen, med norske navn. */
export function buildMenu(): void {
  const isMac = process.platform === 'darwin'
  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: APP_NAME,
            submenu: [
              { role: 'about', label: `Om ${APP_NAME}` },
              { type: 'separator' },
              { role: 'hide', label: `Skjul ${APP_NAME}` },
              { role: 'hideOthers', label: 'Skjul andre' },
              { role: 'unhide', label: 'Vis alle' },
              { type: 'separator' },
              { role: 'quit', label: `Avslutt ${APP_NAME}` }
            ]
          } satisfies MenuItemConstructorOptions
        ]
      : []),
    {
      label: 'Rediger',
      submenu: [
        { role: 'undo', label: 'Angre' },
        { role: 'redo', label: 'Gjør om' },
        { type: 'separator' },
        { role: 'cut', label: 'Klipp ut' },
        { role: 'copy', label: 'Kopier' },
        { role: 'paste', label: 'Lim inn' },
        { role: 'selectAll', label: 'Merk alt' }
      ]
    },
    {
      label: 'Vis',
      submenu: [
        { role: 'togglefullscreen', label: 'Fullskjerm' },
        ...(app.isPackaged
          ? []
          : ([
              { type: 'separator' },
              { role: 'reload', label: 'Last inn på nytt' },
              { role: 'toggleDevTools', label: 'Utviklerverktøy' }
            ] satisfies MenuItemConstructorOptions[]))
      ]
    },
    {
      label: 'Vindu',
      submenu: [
        { role: 'minimize', label: 'Minimer' },
        { role: 'zoom', label: 'Zoom' },
        ...(isMac ? [] : ([{ role: 'quit', label: 'Avslutt' }] satisfies MenuItemConstructorOptions[]))
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
