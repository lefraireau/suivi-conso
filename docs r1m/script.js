// Variables globales
let consumptionChart;

// Fonction pour analyser les dates au format jj/mm/aaaa
function parseDate(dateString) {
    let [day, month, year] = dateString.split('/');
    return new Date(`${year}-${month}-${day}`);
}

// Fonction pour afficher l'historique des entrées
function displayHistory() {
    let historyList = document.getElementById('historyList');
    historyList.innerHTML = '';

    let history = JSON.parse(localStorage.getItem('fuelHistory')) || [];

    history.forEach((entry) => {
        let listItem = document.createElement('li');

        if (entry.event === 'Plein fait') {
            listItem.innerText = `Plein fait le ${entry.date} - Prix du carburant : ${entry.fuelPrice} €/L`;
        } else {
            listItem.innerText = `Date : ${entry.date} - Trip : ${entry.trip} km, Conso : ${entry.consumption} L/100 km`;
        }

        historyList.appendChild(listItem);
    });

    updateChart(); // Mettre à jour le graphique
    calculateMonthlyCost(); // Mettre à jour le coût mensuel
}

// Fonction pour enregistrer une nouvelle entrée dans le localStorage
function saveEntry(entry) {
    let history = JSON.parse(localStorage.getItem('fuelHistory')) || [];
    history.unshift(entry); // Ajouter au début pour que le plus récent soit en premier
    localStorage.setItem('fuelHistory', JSON.stringify(history));
}

// Fonction pour réinitialiser les champs du formulaire
function resetFields() {
    document.getElementById('trip').value = '';
    document.getElementById('consumption').value = '';
    document.getElementById('distanceRemaining').innerText = 'Kilomètres restants avant la réserve : --';
    document.getElementById('refuelTime').innerText = 'Vous devrez ravitailler dans : -- km';
    document.getElementById('costEstimate').innerText = 'Coût estimé : -- €';
}

// Fonction pour mettre à jour le graphique
function updateChart() {
    let history = JSON.parse(localStorage.getItem('fuelHistory')) || [];

    // Filtrer les entrées qui ont des données de consommation
    let dataEntries = history.filter(entry => entry.consumption && entry.trip);

    // Extraire les dates et les consommations
    let dates = dataEntries.map(entry => entry.date);
    let consumptions = dataEntries.map(entry => parseFloat(entry.consumption));
    let trips = dataEntries.map(entry => parseFloat(entry.trip));

    // Si le graphique existe déjà, on le détruit pour le recréer
    if (consumptionChart) {
        consumptionChart.destroy();
    }

    // Créer le graphique
    let ctx = document.getElementById('consumptionChart').getContext('2d');
    consumptionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.reverse(), // Inverser pour avoir les plus anciennes en premier
            datasets: [{
                label: 'Consommation (L/100 km)',
                data: consumptions.reverse(),
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                fill: false,
                yAxisID: 'y-axis-1',
            },
            {
                label: 'Trip (km)',
                data: trips.reverse(),
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 2,
                fill: false,
                yAxisID: 'y-axis-2',
            }]
        },
        options: {
            scales: {
                yAxes: [{
                    type: 'linear',
                    position: 'left',
                    id: 'y-axis-1',
                    scaleLabel: {
                        display: true,
                        labelString: 'Consommation (L/100 km)'
                    }
                }, {
                    type: 'linear',
                    position: 'right',
                    id: 'y-axis-2',
                    scaleLabel: {
                        display: true,
                        labelString: 'Trip (km)'
                    },
                    gridLines: {
                        drawOnChartArea: false,
                    }
                }]
            }
        }
    });
}

// Fonction pour calculer le coût mensuel en essence
function calculateMonthlyCost() {
    let history = JSON.parse(localStorage.getItem('fuelHistory')) || [];
    let monthlyData = {};

    // Parcourir l'historique pour calculer le total par mois
    history.forEach(entry => {
        if (entry.trip && entry.consumption) {
            // Convertir la date en objet Date
            let entryDate = parseDate(entry.date);

            if (isNaN(entryDate)) {
                console.error(`Date invalide : ${entry.date}`);
                return;
            }

            // Obtenir le mois et l'année
            let month = entryDate.getMonth() + 1; // Les mois commencent à 0
            let year = entryDate.getFullYear();
            let monthYear = `${month.toString().padStart(2, '0')}/${year}`;

            // Calculer la quantité de carburant consommée pour cette entrée
            let fuelConsumed = (parseFloat(entry.trip) * parseFloat(entry.consumption)) / 100;

            // Ajouter au total du mois
            if (monthlyData[monthYear]) {
                monthlyData[monthYear] += fuelConsumed;
            } else {
                monthlyData[monthYear] = fuelConsumed;
            }
        }
    });

    // Générer le contenu HTML pour afficher les coûts mensuels
    let monthlyCostResults = document.getElementById('monthlyCostResults');
    monthlyCostResults.innerHTML = '';

    let fuelPrice = 1.58; // Prix du carburant fixé à 1,58 €

    if (Object.keys(monthlyData).length === 0) {
        monthlyCostResults.innerText = "Aucune donnée disponible pour calculer le coût mensuel.";
        return;
    }

    // Trier les mois par ordre chronologique
    let sortedMonths = Object.keys(monthlyData).sort((a, b) => {
        let [monthA, yearA] = a.split('/').map(Number);
        let [monthB, yearB] = b.split('/').map(Number);
        return new Date(yearA, monthA - 1) - new Date(yearB, monthB - 1);
    });

    sortedMonths.forEach(monthYear => {
        let totalFuel = monthlyData[monthYear];
        let cost = totalFuel * fuelPrice;

        let monthCostElement = document.createElement('p');
        monthCostElement.innerText = `Mois ${monthYear} : ${cost.toFixed(2)} € dépensés en carburant`;
        monthlyCostResults.appendChild(monthCostElement);
    });
}

// Fonction pour envoyer une notification
function sendNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Alerte Carburant', {
            body: message,
            icon: 'ducati-logo.png'
        });
    }
}

// Fonction pour demander la permission de notification
function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission();
    }
}

// Événement au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    displayHistory();
    requestNotificationPermission();
});

// Événement pour le bouton "Calculer"
document.getElementById('calculateButton').addEventListener('click', function() {
    // Récupération des valeurs du formulaire
    let trip = parseFloat(document.getElementById('trip').value);
    let consumption = parseFloat(document.getElementById('consumption').value);
    let fuelPrice = 1.58; // Prix du carburant fixé à 1,58 €

    if (isNaN(trip) || isNaN(consumption)) {
        alert("Veuillez entrer des valeurs valides.");
        return;
    }

    // Capacité totale du réservoir et capacité de la réserve
    let totalCapacity = 17; // en litres
    let reserveCapacity = 5; // en litres

    // Calcul des litres consommés
    let litersConsumed = (trip * consumption) / 100;

    // Calcul du nombre de litres restants avant de tomber en réserve
    let remainingLiters = totalCapacity - litersConsumed;
    let remainingLitersBeforeReserve = remainingLiters - reserveCapacity;

    // Calcul de la distance restante avant de tomber en réserve
    let remainingDistanceBeforeReserve = (remainingLitersBeforeReserve * 100) / consumption;

    // Calcul de la distance totale avant ravitaillement
    let totalDistanceBeforeRefuel = (remainingLiters * 100) / consumption;

    // Calcul du coût estimé
    let costEstimate = litersConsumed * fuelPrice;

    // Affichage des résultats
    document.getElementById('distanceRemaining').innerText = 
        `Kilomètres restants avant la réserve : ${remainingDistanceBeforeReserve.toFixed(1)} km`;

    document.getElementById('refuelTime').innerText = 
        `Vous devrez ravitailler dans : ${totalDistanceBeforeRefuel.toFixed(1)} km`;

    document.getElementById('costEstimate').innerText = 
        `Coût estimé : ${costEstimate.toFixed(2)} €`;

    // Seuil pour la notification (par exemple, 50 km avant la réserve)
    let notificationThreshold = 50;

    if (remainingDistanceBeforeReserve <= notificationThreshold) {
        sendNotification(`Attention ! Il ne vous reste que ${remainingDistanceBeforeReserve.toFixed(1)} km avant la réserve.`);
    }

    // Enregistrer l'entrée dans l'historique
    let entry = {
        date: new Date().toLocaleDateString(),
        trip: trip,
        consumption: consumption.toFixed(1),
        event: null // Pas d'événement spécial
    };

    saveEntry(entry);
    displayHistory();
});

// Événement pour le bouton "Plein fait"
document.getElementById('resetButton').addEventListener('click', function() {
    let fuelPrice = 1.58; // Prix du carburant fixé à 1,58 €

    let resetEntry = {
        date: new Date().toLocaleDateString(),
        event: 'Plein fait',
        fuelPrice: fuelPrice.toFixed(2)
    };

    saveEntry(resetEntry);
    resetFields();
    displayHistory();
});

// Événement pour le bouton "Reset"
document.getElementById('clearHistoryButton').addEventListener('click', function() {
    if (confirm("Êtes-vous sûr de vouloir supprimer tout l'historique ?")) {
        localStorage.removeItem('fuelHistory');
        displayHistory();
        document.getElementById('monthlyCostResults').innerHTML = '';
    }
});

// Événement pour le bouton "Générer le rapport"
document.getElementById('generateReportButton').addEventListener('click', function() {
    let startDate = new Date(document.getElementById('startDate').value);
    let endDate = new Date(document.getElementById('endDate').value);

    if (isNaN(startDate) || isNaN(endDate)) {
        alert("Veuillez entrer des dates valides.");
        return;
    }

    if (startDate > endDate) {
        alert("La date de début doit être antérieure à la date de fin.");
        return;
    }

    generateReport(startDate, endDate);
});

// Fonction pour générer le rapport
function generateReport(startDate, endDate) {
    let history = JSON.parse(localStorage.getItem('fuelHistory')) || [];

    // Filtrer les entrées dans la plage de dates
    let filteredEntries = history.filter(entry => {
        let entryDate = parseDate(entry.date);
        return entryDate >= startDate && entryDate <= endDate && entry.trip && entry.consumption;
    });

    if (filteredEntries.length === 0) {
        document.getElementById('reportResults').innerText = "Aucune donnée disponible pour cette période.";
        return;
    }

    // Calculer les totaux et les moyennes
    let totalTrip = filteredEntries.reduce((sum, entry) => sum + parseFloat(entry.trip), 0);
    let totalConsumption = filteredEntries.reduce((sum, entry) => sum + parseFloat(entry.consumption), 0);
    let averageConsumption = totalConsumption / filteredEntries.length;

    // Afficher les résultats
    document.getElementById('reportResults').innerHTML = `
        <p>Total des kilomètres parcourus : ${totalTrip.toFixed(1)} km</p>
        <p>Consommation moyenne : ${averageConsumption.toFixed(2)} L/100 km</p>
    `;
}
