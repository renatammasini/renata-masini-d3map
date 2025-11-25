window.addEventListener('DOMContentLoaded', function () {
  // grab a reference to all the elements that will control the show/hide of the nav

  const buttons = document.querySelectorAll('.js-nav');
  // const closeButton = document.querySelector('#close-button');

  // loop through each of the nav icon triggers and add an event listener
  buttons.forEach(function (button) {
    button.addEventListener('click', toggleMenu);
  });

  // closeButton.addEventListener('click', toggleMenu);

  // create the event handler function to toggle the active state of body

  function toggleMenu() {
    document.body.classList.toggle('menu-is-open');
  }
});
