'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // NOTE: this.date.getMonth() returns numbers from 0-11
    this.description = `${this.type.toUpperCase()} on ${ months[this.date.getMonth()]} ${this.date.getDate()}`;

  }

}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration) {
    super(coords, distance, duration);

    // Run functions
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration) {
    super(coords, distance, duration);

    // Run functions
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

/*---------------------------------------------------------------------------------------------*/
/* APPLICATION ARCHITECTURE
-----------------------------------------------------------------------------------------------*/

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const resetBtn = document.querySelector('.resetBtn');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  // Gets executed immediately after new class instance is created (after the page loads)
  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Add new workout object
    form.addEventListener('submit', this._newWorkout.bind(this));

    // Move to workout marker on click
    containerWorkouts.addEventListener('click', this._moveToMarker.bind(this));

    // Reset Button
    resetBtn.addEventListener("click", this.reset)
  }

  _getPosition() {

    let error = function () {
      alert('Could not get your position. Please allow access to your location.');
    }

    // Native method to get current device location
    if (navigator.geolocation) {
      // getCurrentPosition expects a Success callback function as the first arg
      // Callbacks are treated as regular function calls, in which 'this' keyword is undefined (context of 'this' is lost)
      // As if '_loadMap' gets detached from the class and now on its own. 'this._loadMap' is treated as a separate function

      // .bind(this) passes the callback function back to the class ('this' here refers to the class)
      // .bind() method returns a function, that is why we can use it for callbacks (cannot use .call)
      // NOTE that we don't explicitly pass any arguments into _loadmap. getCurrentPosition does this for us.
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), error);
    }
  }

  _loadMap(position) {

    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    // console.log(this); // Will return 'undefined' if not binded

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    console.log(mapE);
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value = inputDuration.value = '';

    form.style.display = 'none';
    form.classList.add('hidden');

    // setTimeout needed to avoid content jumping after new workout is added
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _newWorkout(e) {

    e.preventDefault();

    // Input validation
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout running, create running object
    if (type === 'running') {

      // Check if data is valid
      if (
        !validInputs(distance, duration) ||
        !allPositive(distance, duration)
      ){
        return alert('Inputs have to be positive numbers!');
      }

      workout = new Running([lat, lng], distance, duration);
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {

      if (
        !validInputs(distance, duration) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration);
    }

    console.log(workout);

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '&#127939;' : '&#128692;'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
          workout.type === 'running' ? '&#127939;' : '&#128692;'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;
    

    // Add pace/speed details
    if (workout.type === 'running') {
        html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
      </li>
      `;
    }

    if (workout.type === 'cycling'){
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
      </li>
      `;
    }
      
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToMarker(e) {
    // BUGFIX: When we click on a workout before the map has loaded, we get an error. But there is an easy fix:
    if (!this.#map) return;

    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    
    const data = JSON.parse(localStorage.getItem('workouts'));

    console.log(data);

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();

