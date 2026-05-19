window.showCategory = function(event, categoryId) {

    // SECCIONES
    const sections = document.querySelectorAll(".category-section");

    sections.forEach(section => {
        section.classList.add("hidden");
    });

    const target = document.getElementById(categoryId);

    if (target) {
        target.classList.remove("hidden");
    }



    // BOTONES
    const buttons = document.querySelectorAll(".category-btn");

    buttons.forEach(button => {

        // quitar estilo activo
        button.classList.remove(
            "bg-[#113e14]",
            "text-white",
            "shadow-md"
        );

        // volver al estilo normal
        button.classList.add(
            "text-[#2D2B2B]"
        );
    });



    // activar botón clickeado
    event.currentTarget.classList.add(
        "bg-[#113e14]",
        "text-white",
        "shadow-md"
    );

    event.currentTarget.classList.remove(
        "text-[#2D2B2B]"
    );
};

document.addEventListener("DOMContentLoaded", () => {
    const firstButton = document.querySelector(".category-btn");

    if (firstButton) {
        const firstCategoryId = firstButton.getAttribute("onclick")
            ?.match(/'([^']+)'/)?.[1];

        if (firstCategoryId) {
            firstButton.click(); // simulate click
        }
    }
});