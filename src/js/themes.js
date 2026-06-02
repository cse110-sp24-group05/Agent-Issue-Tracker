/**
 * This file contains helper methods for switching themes.
 * Currently only dark and light themes are supported.
 */

const themeColorNames = [
  "--color-text-theme",
  "--color-text-gray-theme",
  "--color-background-theme",
  "--color-fill-theme",
  "--color-priority-low-theme",
  "--color-hover-theme",
]

const darkColorNames = [
  "--color-text-light", // with dark theme, the text is going to be light
  "--color-text-gray-light", 
  "--color-background-dark",
  "--color-fill-dark",
  "--color-priority-low-dark",
  "--color-hover-dark",
]

const lightColorNames = [
  "--color-text-dark", // with light theme, the text is going to be dark
  "--color-text-gray-dark", 
  "--color-background-light",
  "--color-fill-light",
  "--color-priority-low",
  "--color-hover-light",
]

const themes = {
  LIGHT: "light",
  DARK: "dark",
}
let activeTheme = themes.LIGHT;

export function useDarkTheme() {
  // for (let i = 0; i < themeColorNames.length; i++) {
  //   const newColor = getComputedStyle(document.documentElement, null).getPropertyValue(darkColorNames[i]);
  //   document.documentElement.style.setProperty(themeColorNames[i], newColor);
  // }
  if (document.body.classList.contains("light-theme")) document.body.classList.replace("light-theme", "dark-theme");
  else document.body.classList.add("dark-theme");
  activeTheme = themes.DARK;
  localStorage.setItem("theme", "dark-theme");
}

export function useLightTheme() {
  // for (let i = 0; i < themeColorNames.length; i++) {
  //   const newColor = document.documentElement.style.getPropertyValue(lightColorNames[i]);
  //   document.documentElement.style.setProperty(themeColorNames[i], newColor);
  // }
  if (document.body.classList.contains("dark-theme")) document.body.classList.replace("dark-theme", "light-theme");
  else document.body.classList.add("light-theme");
  activeTheme = themes.LIGHT;
  localStorage.setItem("theme", "light-theme");
}

export function getActiveTheme() {
  console.log(activeTheme);
  return activeTheme;
}

function init() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme == "dark-theme") useDarkTheme();
  else if (savedTheme == "light-theme") useLightTheme();
}

useDarkTheme();
init();
