document.addEventListener('DOMContentLoaded', () => {
    const tips = [
        "Water early in the morning to reduce evaporation.",
        "Most houseplants prefer bright indirect sunlight.",
        "Allow the top layer of soil to dry before watering again.",
        "Good drainage helps prevent root rot.",
        "Remove yellow or dead leaves regularly.",
        "Rotate your plants every week for even growth.",
        "Clean leaves to improve photosynthesis.",
        "Air circulation helps prevent fungal diseases.",
        "Fertilize during the active growing season.",
        "Repot when roots begin to circle the pot.",
        "Use pots with drainage holes whenever possible.",
        "Overwatering is more harmful than underwatering.",
        "Check soil moisture before adding water.",
        "Prune stems to encourage fuller growth.",
        "Avoid sudden temperature changes.",
        "Keep most indoor plants away from air conditioners.",
        "Use room-temperature water to avoid root stress.",
        "Morning sunlight is gentler than afternoon sun.",
        "Dust on leaves can reduce light absorption.",
        "Healthy roots are the foundation of a healthy plant.",
        "Increase humidity for tropical plants.",
        "Group plants together to maintain moisture.",
        "Do not let pots sit in standing water.",
        "Inspect leaves regularly for pests.",
        "Neem oil can help control common insects.",
        "Trim spent flowers to encourage new blooms.",
        "Use well-draining soil for potted plants.",
        "Cacti and succulents need less frequent watering.",
        "Snake plants tolerate low light conditions.",
        "Orchids prefer airy roots and coarse substrate.",
        "Rainwater is beneficial for many sensitive plants.",
        "Terracotta pots allow soil to dry faster.",
        "Plastic pots retain moisture longer.",
        "Always water thoroughly until excess drains out.",
        "Reduce watering during cooler months.",
        "New growth is a sign of good plant health.",
        "Brown leaf tips can indicate low humidity.",
        "Yellow leaves often suggest overwatering.",
        "Leggy growth usually means insufficient light.",
        "Use mulch to help retain soil moisture.",
        "Avoid fertilizing stressed or newly repotted plants.",
        "Monitor for root-bound plants every few months.",
        "Prune damaged roots during repotting.",
        "Morning is the best time to inspect your plants.",
        "Consistent care is better than frequent changes.",
        "Different species have different watering needs.",
        "Always research the specific plant you own.",
        "Indirect light means bright light without direct sun.",
        "Root rot often causes a sour smell in the soil.",
        "Healthy leaves should feel firm and vibrant."
    ];

    const tipElement = document.getElementById('plant-tip');
    const randomTip = tips[Math.floor(Math.random() * tips.length)];

    if (tipElement) {
        tipElement.textContent = randomTip;
    }
});