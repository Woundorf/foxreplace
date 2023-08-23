/** ***** BEGIN LICENSE BLOCK *****
 *
 *  Copyright (C) 2022 Marc Ruiz Altisent. All rights reserved.
 *
 *  This file is part of FoxReplace.
 *
 *  FoxReplace is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software
 *  Foundation, either version 3 of the License, or (at your option) any later version.
 *
 *  FoxReplace is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 *  A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License along with FoxReplace. If not, see <http://www.gnu.org/licenses/>.
 *
 *  ***** END LICENSE BLOCK ***** */

// Listen to messages from other parts of the WebExtension
browser.runtime.onMessage.addListener(message => {
  switch (message.key) {
    case "replace":
    case "replaceWithList":
      replaceCurrentTab(message);
      break;
  }
});

/**
 * Applies the substitution list contained in aMessage to the current tab.
 */
function replaceCurrentTab(aMessage) {
  const options = { active: true };
  if (aMessage.key != 'replaceWithListPeriod') options.currentWindow = true;    // limit to current window except for periodic substitutions

  browser.tabs.query(options).then(tabs => {
    for (const tab of tabs) browser.tabs.sendMessage(tab.id, aMessage);
  });
}

// Initialize things
storage.getPrefs().then(prefs => {
  if (prefs.enableContextMenu) createContextMenu();

  if (prefs.enableSubscription) subscription.start(prefs.subscriptionUrl, prefs.subscriptionPeriod);

  if (prefs.autoReplacePeriodically) periodicReplace.start(prefs.autoReplacePeriod);

  createToolsMenu(prefs.autoReplaceOnLoad);
});

// Update things
browser.storage.onChanged.addListener(changes => {
  storage.getPrefs().then(prefs => {
    if (changes.enableContextMenu && changes.enableContextMenu.newValue != changes.enableContextMenu.oldValue) {
      if (prefs.enableContextMenu) createContextMenu();
      else browser.menus.remove("context.apply-substitution-list");
    }

    if (changes.enableSubscription && changes.enableSubscription.newValue != changes.enableSubscription.oldValue) {
      if (prefs.enableSubscription) subscription.restart(prefs.subscriptionUrl, prefs.subscriptionPeriod);
      else subscription.stop();
    }

    if (changes.autoReplacePeriodically && changes.autoReplacePeriodically.newValue != changes.autoReplacePeriodically.oldValue) {
      if (prefs.autoReplacePeriodically) periodicReplace.restart(prefs.autoReplacePeriod);
      else periodicReplace.stop();
    }

    if (changes.autoReplaceOnLoad && changes.autoReplaceOnLoad.newValue != changes.autoReplaceOnLoad.oldValue) {
      browser.menus.update("tools.auto-replace-on-load", { checked: prefs.autoReplaceOnLoad });
    }
  });
});

// Listen for periodic replace alarm
browser.alarms.onAlarm.addListener(alarm => {
  if (alarm.name == periodicReplace.alarmName) {
    replaceCurrentTab({ key: "replaceWithListPeriod"});
  }
});

browser.commands.onCommand.addListener(name => {
  switch (name) {
    case "apply-substitution-list":
      replaceCurrentTab({ key: "replaceWithList" });
      break;
  }
});

function createContextMenu() {
  browser.menus.create({
    id: "context.apply-substitution-list",
    title: browser.i18n.getMessage("menu.replaceWithList"),
    contexts: ["all"]
  });
}

function createToolsMenu(autoReplaceOnLoad) {
  browser.menus.create({
    id: "tools.replace",
    title: browser.i18n.getMessage("menu.replace"),
    contexts: ["tools_menu"]
  });
  browser.menus.create({
    id: "tools.apply-substitution-list",
    title: browser.i18n.getMessage("menu.replaceWithList"),
    contexts: ["tools_menu"]
  });
  browser.menus.create({
    id: "tools.auto-replace-on-load",
    type: "checkbox",
    title: browser.i18n.getMessage("menu.autoReplaceOnLoad"),
    contexts: ["tools_menu"],
    checked: autoReplaceOnLoad
  });
  browser.menus.create({
    id: "tools.options",
    title: browser.i18n.getMessage("menu.options"),
    contexts: ["tools_menu"]
  });
  browser.menus.create({
    id: 'tools.help',
    title: browser.i18n.getMessage('menu.help'),
    contexts: ['tools_menu']
  });
}

browser.menus.onClicked.addListener(info => {
  if (info.menuItemId == "tools.replace") {
    browser.sidebarAction.open();
  }
  else if (info.menuItemId == "context.apply-substitution-list" || info.menuItemId == "tools.apply-substitution-list") {
    replaceCurrentTab({ key: "replaceWithList" });
  }
  else if (info.menuItemId == "tools.auto-replace-on-load") {
    storage.setPrefs({ autoReplaceOnLoad: info.checked });
  }
  else if (info.menuItemId == "tools.options") {
    browser.runtime.openOptionsPage();
  }
  else if (info.menuItemId == 'tools.help') {
     browser.tabs.create({
      url: 'https://github.com/Woundorf/foxreplace/wiki/FAQ'
    });
  }
});
