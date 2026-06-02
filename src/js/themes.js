/**
 * This file contains helper methods for switching themes.
 * Currently only dark and light themes are supported.
 */

/**
 * These color names are not actually used in the script,
 * but they're good to have as a reference
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

/**
 * Applies the dark theme to the entire website
 * This does not save the theme in local storage
 */
export function useDarkTheme() {
  if (document.body.classList.contains("light-theme")) document.body.classList.replace("light-theme", "dark-theme");
  else document.body.classList.add("dark-theme");
  activeTheme = themes.DARK;
}

/**
 * Applies the light theme to the entire website
 * This does not save the theme in local storage
 */
export function useLightTheme() {
  if (document.body.classList.contains("dark-theme")) document.body.classList.replace("dark-theme", "light-theme");
  else document.body.classList.add("light-theme");
  activeTheme = themes.LIGHT;
}

/**
 * Save the currently-selected theme in local storage
 */
export function saveTheme() {
  if (activeTheme == themes.DARK) {
    localStorage.setItem("theme", "dark-theme");
  }
  else if (activeTheme == themes.LIGHT) {
    localStorage.setItem("theme", "light-theme");
  }
}

/**
 * @returns The theme (light or dark) being used by the page
 */
export function getActiveTheme() {
  console.log(activeTheme);
  return activeTheme;
}

/**
 * Loads the theme from local storage
 */
function init() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme == "dark-theme") useDarkTheme();
  else if (savedTheme == "light-theme") useLightTheme();
}

init();
