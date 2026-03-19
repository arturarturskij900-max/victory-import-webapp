// ===== Telegram Web App Init =====

const tg = window.Telegram?.WebApp;
let carsData = null;

// Состояние фильтров
const state = {
  brands: [],
  models: [],
  yearFrom: null,
  yearTo: null,
  auctions: [],
  damageTypes: [],
  mileageFrom: null,
  mileageTo: null,
  fuelTypes: [],
  engineFrom: null,
  engineTo: null,
  transmissions: [],
  priceEUFrom: null,
  priceEUTo: null,
  priceRUFrom: null,
  priceRUTo: null
};

// ===== Инициализация =====

document.addEventListener('DOMContentLoaded', async () => {
  // Инициализация Telegram Web App
  if (tg) {
    tg.ready();
    tg.expand();

    // Применяем тему Telegram
    if (tg.colorScheme === 'dark') {
      document.body.classList.add('dark');
    }

    // Устанавливаем цвет из Telegram
    const root = document.documentElement;
    if (tg.themeParams) {
      if (tg.themeParams.bg_color) {
        root.style.setProperty('--bg-primary', tg.themeParams.bg_color);
      }
      if (tg.themeParams.secondary_bg_color) {
        root.style.setProperty('--bg-secondary', tg.themeParams.secondary_bg_color);
      }
      if (tg.themeParams.text_color) {
        root.style.setProperty('--text-primary', tg.themeParams.text_color);
      }
      if (tg.themeParams.hint_color) {
        root.style.setProperty('--text-muted', tg.themeParams.hint_color);
      }
    }
  }

  // Загрузка данных
  await loadCarsData();

  // Инициализация фильтров
  initFilters();

  // Обработчики
  setupAccordion();
  setupSubmit();
  setupClose();
});

// ===== Загрузка данных =====

async function loadCarsData() {
  try {
    const res = await fetch('cars.json');
    carsData = await res.json();
  } catch (err) {
    console.error('Ошибка загрузки данных:', err);
    carsData = {
      brands: [],
      auctions: ['Mobile.de', 'AutoScout24', 'Copart EU'],
      damageTypes: ['Без повреждений', 'Минимальные', 'Требует ремонта'],
      fuelTypes: ['Бензин', 'Дизель', 'Гибрид', 'Электро'],
      transmissionTypes: ['Автомат', 'Механика', 'Вариатор', 'Робот'],
      years: { min: 2000, max: 2026 }
    };
  }
}

// ===== Инициализация фильтров =====

function initFilters() {
  // Марки
  renderCheckboxOptions('brands-options', carsData.brands.map(b => b.name), 'brands');

  // Аукционы
  renderCheckboxOptions('auctions-options', carsData.auctions, 'auctions');

  // Состояние
  renderCheckboxOptions('damageTypes-options', carsData.damageTypes, 'damageTypes');

  // Топливо
  renderCheckboxOptions('fuelTypes-options', carsData.fuelTypes, 'fuelTypes');

  // КПП
  renderCheckboxOptions('transmissions-options', carsData.transmissionTypes, 'transmissions');

  // Год — select
  const yearFrom = document.getElementById('year-from');
  const yearTo = document.getElementById('year-to');

  yearFrom.innerHTML = '<option value="">—</option>';
  yearTo.innerHTML = '<option value="">—</option>';

  for (let y = carsData.years.max; y >= carsData.years.min; y--) {
    yearFrom.innerHTML += `<option value="${y}">${y}</option>`;
    yearTo.innerHTML += `<option value="${y}">${y}</option>`;
  }

  yearFrom.addEventListener('change', () => {
    state.yearFrom = yearFrom.value || null;
    updateBadge('year');
  });

  yearTo.addEventListener('change', () => {
    state.yearTo = yearTo.value || null;
    updateBadge('year');
  });

  // Пробег
  setupRangeInputs('mileage-from', 'mileage-to', 'mileageFrom', 'mileageTo', 'mileage');

  // Двигатель
  setupRangeInputs('engine-from', 'engine-to', 'engineFrom', 'engineTo', 'engineVolume');

  // Цена Европа (EUR)
  setupRangeInputs('priceEU-from', 'priceEU-to', 'priceEUFrom', 'priceEUTo', 'priceEU');

  // Цена под ключ (RUB)
  setupRangeInputs('priceRU-from', 'priceRU-to', 'priceRUFrom', 'priceRUTo', 'priceRU');

  // Поиск по маркам
  document.getElementById('brands-search').addEventListener('input', (e) => {
    filterOptions('brands-options', e.target.value);
  });

  // Поиск по моделям
  document.getElementById('models-search').addEventListener('input', (e) => {
    filterOptions('models-options', e.target.value);
  });
}

// ===== Рендер чекбокс-опций =====

function renderCheckboxOptions(containerId, options, stateKey) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  options.forEach((option, index) => {
    const id = `${stateKey}-${index}`;
    const div = document.createElement('div');
    div.className = 'filter-option';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = id;
    checkbox.value = option;

    const label = document.createElement('label');
    label.className = 'filter-option__label';
    label.htmlFor = id;
    label.textContent = option;

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        if (!state[stateKey].includes(option)) {
          state[stateKey].push(option);
        }
      } else {
        state[stateKey] = state[stateKey].filter(v => v !== option);
      }
      updateBadge(stateKey);

      // Если изменились марки — обновляем модели
      if (stateKey === 'brands') {
        updateModels();
      }
    });

    div.appendChild(checkbox);
    div.appendChild(label);
    container.appendChild(div);
  });
}

// ===== Обновление моделей =====

function updateModels() {
  const container = document.getElementById('models-options');

  if (state.brands.length === 0) {
    container.innerHTML = '<p class="filter-options__empty">Сначала выберите марку</p>';
    state.models = [];
    updateBadge('models');
    return;
  }

  const allModels = [];
  state.brands.forEach(brandName => {
    const brand = carsData.brands.find(b => b.name === brandName);
    if (brand) {
      brand.models.forEach(model => {
        allModels.push(`${brandName} ${model}`);
      });
    }
  });

  state.models = state.models.filter(m => allModels.includes(m));

  renderCheckboxOptions('models-options', allModels, 'models');

  // Восстанавливаем чекбоксы
  state.models.forEach(model => {
    const index = allModels.indexOf(model);
    if (index >= 0) {
      const checkbox = document.getElementById(`models-${index}`);
      if (checkbox) checkbox.checked = true;
    }
  });

  updateBadge('models');
}

// ===== Настройка range-инпутов =====

function setupRangeInputs(fromId, toId, fromKey, toKey, badgeKey) {
  const fromEl = document.getElementById(fromId);
  const toEl = document.getElementById(toId);

  fromEl.addEventListener('input', () => {
    state[fromKey] = fromEl.value ? parseFloat(fromEl.value) : null;
    updateBadge(badgeKey);
  });

  toEl.addEventListener('input', () => {
    state[toKey] = toEl.value ? parseFloat(toEl.value) : null;
    updateBadge(badgeKey);
  });
}

// ===== Обновление бейджиков =====

function updateBadge(filterKey) {
  const badge = document.getElementById(`${filterKey}-badge`);
  if (!badge) return;

  let count = 0;

  switch (filterKey) {
    case 'brands':
    case 'models':
    case 'auctions':
    case 'damageTypes':
    case 'fuelTypes':
    case 'transmissions':
      count = state[filterKey].length;
      break;
    case 'year':
      count = (state.yearFrom ? 1 : 0) + (state.yearTo ? 1 : 0);
      break;
    case 'mileage':
      count = (state.mileageFrom ? 1 : 0) + (state.mileageTo ? 1 : 0);
      break;
    case 'engineVolume':
      count = (state.engineFrom ? 1 : 0) + (state.engineTo ? 1 : 0);
      break;
    case 'priceEU':
      count = (state.priceEUFrom ? 1 : 0) + (state.priceEUTo ? 1 : 0);
      break;
    case 'priceRU':
      count = (state.priceRUFrom ? 1 : 0) + (state.priceRUTo ? 1 : 0);
      break;
  }

  if (count > 0) {
    badge.textContent = count;
    badge.classList.add('visible');
  } else {
    badge.textContent = '';
    badge.classList.remove('visible');
  }
}

// ===== Поиск/фильтрация опций =====

function filterOptions(containerId, query) {
  const container = document.getElementById(containerId);
  const options = container.querySelectorAll('.filter-option');
  const lowerQuery = query.toLowerCase();

  options.forEach(option => {
    const label = option.querySelector('.filter-option__label');
    if (label.textContent.toLowerCase().includes(lowerQuery)) {
      option.style.display = '';
    } else {
      option.style.display = 'none';
    }
  });
}

// ===== Аккордеон =====

function setupAccordion() {
  const headers = document.querySelectorAll('.filter-item__header');

  headers.forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      const wasOpen = item.classList.contains('open');

      // Закрываем все
      document.querySelectorAll('.filter-item.open').forEach(el => {
        el.classList.remove('open');
      });

      // Открываем текущий (если он был закрыт)
      if (!wasOpen) {
        item.classList.add('open');

        setTimeout(() => {
          item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    });
  });
}

// ===== Отправка данных =====

function setupSubmit() {
  const submitBtn = document.getElementById('submitBtn');

  submitBtn.addEventListener('click', () => {
    const data = {};

    if (state.brands.length > 0) data.brands = state.brands;
    if (state.models.length > 0) data.models = state.models;
    if (state.yearFrom) data.yearFrom = state.yearFrom;
    if (state.yearTo) data.yearTo = state.yearTo;
    if (state.auctions.length > 0) data.auctions = state.auctions;
    if (state.damageTypes.length > 0) data.damageTypes = state.damageTypes;
    if (state.mileageFrom) data.mileageFrom = state.mileageFrom;
    if (state.mileageTo) data.mileageTo = state.mileageTo;
    if (state.fuelTypes.length > 0) data.fuelTypes = state.fuelTypes;
    if (state.engineFrom) data.engineFrom = state.engineFrom;
    if (state.engineTo) data.engineTo = state.engineTo;
    if (state.transmissions.length > 0) data.transmissions = state.transmissions;
    if (state.priceEUFrom) data.priceFrom = state.priceEUFrom;
    if (state.priceEUTo) data.priceTo = state.priceEUTo;
    if (state.priceRUFrom) data.priceRUFrom = state.priceRUFrom;
    if (state.priceRUTo) data.priceRUTo = state.priceRUTo;

    // Проверяем, что выбрано хотя бы что-то
    if (Object.keys(data).length === 0) {
      submitBtn.style.background = '#ef4444';
      submitBtn.textContent = 'Выберите хотя бы один фильтр!';
      setTimeout(() => {
        submitBtn.style.background = '';
        submitBtn.textContent = 'Подписаться на обновления';
      }, 2000);
      return;
    }

    // Отправляем в Telegram
    if (tg) {
      tg.sendData(JSON.stringify(data));
    } else {
      console.log('Subscription data:', data);
      alert('Фильтры сохранены (тестовый режим):\n' + JSON.stringify(data, null, 2));
    }
  });
}

// ===== Закрытие =====

function setupClose() {
  document.getElementById('closeBtn').addEventListener('click', () => {
    if (tg) {
      tg.close();
    } else {
      window.close();
    }
  });
}
