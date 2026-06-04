function toggleMenu() {
    const menu = document.getElementById("menu");
    menu.classList.toggle("hidden");
}

window.toggleMenu = toggleMenu;
document.addEventListener("click", function (event) {

    const menu = document.getElementById("menu");
    const button = event.target.closest("button");
    const menuClicked = event.target.closest("#menu");

    if (!menuClicked && !button) {
        menu.classList.add("hidden");
    }

});