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

function initializeCategoriesPage() {
    const firstButton = document.querySelector(".category-btn");

    if (firstButton) {
        const firstCategoryId = firstButton.getAttribute("onclick")
            ?.match(/'([^']+)'/)?.[1];

        if (firstCategoryId) {
            firstButton.click(); // simulate click
        }
    }

    setupFavoriteButtons();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeCategoriesPage);
} else {
    initializeCategoriesPage();
}

function setupFavoriteButtons() {
    const favoriteIcon = "favorites2.png";
    const notFavoriteIcons = ["fav.png", "favo.png"];
    const defaultNotFavoriteIcon = "favo.png";
    const isCommunityPage = window.location.pathname.includes("/community");
    const isFavoritesPage = window.location.pathname.includes("/favorites");

    if (isFavoritesPage) {
        renderSavedCommunityFavorites(favoriteIcon);
    }

    document.querySelectorAll("button").forEach((button) => {
        const icon = Array.from(button.querySelectorAll("div")).find((element) =>
            isFavoriteIcon(element, favoriteIcon, notFavoriteIcons)
        );
        const counter = button.querySelector("span");

        if (!icon || !counter || !/^\d+k?$/i.test(counter.textContent.trim())) {
            return;
        }

        const post = findFavoritePost(button);

        if (!post) {
            return;
        }

        const postId = getFavoritePostId(post);
        post.dataset.favoritePostId = postId;
        icon.dataset.notFavoriteIcon = getCurrentNotFavoriteIcon(icon, notFavoriteIcons) ?? defaultNotFavoriteIcon;

        const savedState = getSavedFavoriteState(postId);
        const isSavedFavorite = savedState === "true";

        if (isSavedFavorite) {
            setFavoriteIcon(icon, true, favoriteIcon);
        }

        if (savedState === "false" || (!isFavoritesPage && !isSavedFavorite)) {
            setFavoriteIcon(icon, false, favoriteIcon);

            if (isFavoritesPage) {
                post.remove();
                return;
            }
        }

        button.type = "button";
        button.setAttribute("aria-pressed", icon.className.includes(favoriteIcon) ? "true" : "false");

        button.addEventListener("click", () => {
            const isFavorite = icon.className.includes(favoriteIcon);
            const nextState = !isFavorite;

            setFavoriteIcon(icon, nextState, favoriteIcon);
            button.setAttribute("aria-pressed", String(nextState));
            saveFavoriteState(postId, nextState);

            if (nextState) {
                saveFavoritePost(postId, post);
            } else {
                removeFavoritePost(postId);
            }

            if (isFavoritesPage && !nextState) {
                post.remove();
                showEmptyFavoritesMessage();
            }

            if (isCommunityPage) {
                removeEmptyFavoritesMessage();
            }
        });
    });

    if (isFavoritesPage) {
        showEmptyFavoritesMessage();
    }
}

function isFavoriteIcon(element, favoriteIcon, notFavoriteIcons) {
    return element.className.includes(favoriteIcon) ||
        notFavoriteIcons.some((icon) => element.className.includes(icon));
}

function getCurrentNotFavoriteIcon(icon, notFavoriteIcons) {
    return notFavoriteIcons.find((notFavoriteIcon) => icon.className.includes(notFavoriteIcon));
}

function getSavedFavoriteState(postId) {
    try {
        return localStorage.getItem(`favorite:${postId}`);
    } catch {
        return null;
    }
}

function saveFavoriteState(postId, isFavorite) {
    try {
        localStorage.setItem(`favorite:${postId}`, String(isFavorite));
    } catch {
        // The click should still update the page when storage is unavailable.
    }
}

function saveFavoritePost(postId, post) {
    try {
        localStorage.setItem(`favorite-post:${postId}`, JSON.stringify({
            id: postId,
            html: buildFavoritePostHtml(post),
        }));
    } catch {
        // Favorites still work visually when storage is unavailable.
    }
}

function removeFavoritePost(postId) {
    try {
        localStorage.removeItem(`favorite-post:${postId}`);
    } catch {
        // Nothing else is needed when storage is unavailable.
    }
}

function getSavedFavoritePosts() {
    const posts = [];

    try {
        for (let index = 0; index < localStorage.length; index += 1) {
            const key = localStorage.key(index);

            if (!key?.startsWith("favorite-post:")) {
                continue;
            }

            const post = JSON.parse(localStorage.getItem(key));

            if (post?.id && post?.html && getSavedFavoriteState(post.id) === "true") {
                posts.push(post);
            }
        }
    } catch {
        return [];
    }

    return posts;
}

function buildFavoritePostHtml(post) {
    const clone = post.cloneNode(true);

    clone.className = clone.className
        .replace("max-w-full", "w-[600px] mx-auto")
        .replace("px-20", "")
        .replace("p-4", "p-6");

    clone.querySelectorAll("div").forEach((element) => {
        if (element.className.includes("favo.png") || element.className.includes("fav.png")) {
            setFavoriteIcon(element, true, "favorites2.png");
        }
    });

    return clone.outerHTML;
}

function renderSavedCommunityFavorites(favoriteIcon) {
    const postsContainer = getFavoritesPostsContainer();

    if (!postsContainer) {
        return;
    }

    getSavedFavoritePosts().forEach((post) => {
        if (findRenderedFavoritePost(post.id)) {
            return;
        }

        const wrapper = document.createElement("div");
        wrapper.innerHTML = post.html.trim();

        const favoritePost = wrapper.firstElementChild;

        if (!favoritePost) {
            return;
        }

        favoritePost.dataset.favoritePostId = post.id;
        favoritePost.querySelectorAll("div").forEach((element) => {
            if (element.className.includes("favo.png") || element.className.includes("fav.png")) {
                setFavoriteIcon(element, true, favoriteIcon);
            }
        });

        postsContainer.insertBefore(favoritePost, postsContainer.children[1] ?? null);
    });
}

function getFavoritesPostsContainer() {
    return document.querySelector("[data-favorites-feed]") ||
        document.querySelector(".flex-1.space-y-4") ||
        document.querySelector(".flex-1.space-y-6");
}

function findRenderedFavoritePost(postId) {
    return Array.from(document.querySelectorAll("[data-favorite-post-id]"))
        .find((post) => post.dataset.favoritePostId === postId);
}

function findFavoritePost(element) {
    let current = element.parentElement;

    while (current) {
        if (current.classList.contains("shadow-lg") && current.classList.contains("rounded-3xl")) {
            return current;
        }

        current = current.parentElement;
    }

    return null;
}

function getFavoritePostId(post) {
    const image = Array.from(post.querySelectorAll("div")).find((element) =>
        element.className.includes("h-96") && /\/resources\/[^'")\]]+\.(jpg|jpeg|png|webp)/i.test(element.className)
    );
    const author = post.querySelector(".font-semibold")?.textContent.trim() ?? "post";
    const text = post.querySelector("p.text-sm")?.textContent.trim().slice(0, 30) ?? "";
    const imageName = image?.className.match(/\/resources\/[^'")\]]+\.(jpg|jpeg|png|webp)/i)?.[0] ?? "";

    return `${author}-${imageName}-${text}`.replace(/\s+/g, "-").toLowerCase();
}

function setFavoriteIcon(icon, isFavorite, favoriteIcon) {
    const notFavoriteIcon = icon.dataset.notFavoriteIcon ?? "favo.png";
    const currentNotFavoriteIcon = getCurrentNotFavoriteIcon(icon, ["fav.png", "favo.png"]) ?? notFavoriteIcon;

    icon.className = icon.className.replace(
        isFavorite ? currentNotFavoriteIcon : favoriteIcon,
        isFavorite ? favoriteIcon : notFavoriteIcon
    );
}

function showEmptyFavoritesMessage() {
    const postsContainer = getFavoritesPostsContainer();

    if (!postsContainer || postsContainer.querySelector("[data-favorite-post-id]")) {
        return;
    }

    if (postsContainer.querySelector("[data-empty-favorites]")) {
        return;
    }

    const message = document.createElement("p");
    message.dataset.emptyFavorites = "true";
    message.className = "w-[600px] mx-auto rounded-3xl bg-white/30 border border-white/30 p-6 text-center font-semibold text-[#113E14]";
    message.textContent = "You do not have favorite publications yet.";
    postsContainer.appendChild(message);
}

function removeEmptyFavoritesMessage() {
    document.querySelector("[data-empty-favorites]")?.remove();
}
