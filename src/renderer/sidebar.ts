const ICONS = {
	more: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="19" r="1.3"/></svg>',
	close: '<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>',
	collapse: '<svg viewBox="0 0 24 24"><path d="m11 17-5-5 5-5M18 17l-5-5 5-5"/></svg>',
	expand: '<svg viewBox="0 0 24 24"><path d="m13 17 5-5-5-5M6 17l5-5-5-5"/></svg>',
	moon: '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>',
	sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
	reload: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4L21 8M21 3v5h-5"/></svg>',
	bell: '<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
	bellOff:
		'<svg viewBox="0 0 24 24"><path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5"/><path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="m2 2 20 20"/></svg>',
	settings:
		'<svg viewBox="0 0 24 24"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
	globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
	folderPlus:
		'<svg viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><path d="M12 10v6M9 13h6"/></svg>',
	chevron: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
};

const HIBERNATION_DESCRIPTION =
	'Libera memória depois de 15 minutos sem uso e acorda ao clicar. Enquanto hiberna, não chegam notificações.';
const MUTE_DESCRIPTION = 'Sem notificações e sem sons deste serviço quando ele não está na tela.';
const INVALID_URL_MESSAGE = 'Endereço inválido. Exemplo: trello.com';
/** Must match the modal transitions in styles.css. */
const MODAL_TRANSITION_MS = 180;
/** Must match the .is-entering / .is-leaving animations in styles.css. */
const ROW_ANIMATION_MS = 200;
const THEME_OPTIONS: { value: PrupruTheme; label: string }[] = [
	{ value: 'system', label: 'Sistema' },
	{ value: 'light', label: 'Claro' },
	{ value: 'dark', label: 'Escuro' },
];

/**
 * Returns up to two initials for an avatar.
 * @param text Account or service name.
 * @returns The initials, or "?" for a name without letters.
 */
function getInitials(text: string): string {
	const words = text.trim().split(/\s+/).filter(Boolean);
	const initials = words
		.slice(0, 2)
		.map((word) => word.charAt(0).toUpperCase())
		.join('');
	return initials || '?';
}

/**
 * Formats a moment as "HH:MM", or "amanhã às HH:MM" when it is not today.
 * @param timestamp Moment in milliseconds.
 * @returns The formatted time.
 */
function formatPauseEnd(timestamp: number): string {
	const end = new Date(timestamp);
	const clock = end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
	return end.toDateString() === new Date().toDateString() ? clock : `amanhã às ${clock}`;
}

/**
 * Returns the next 8:00, today or tomorrow.
 * @returns Moment in milliseconds.
 */
function getNextMorning(): number {
	const morning = new Date();
	morning.setHours(8, 0, 0, 0);
	if (morning.getTime() <= Date.now()) {
		morning.setDate(morning.getDate() + 1);
	}
	return morning.getTime();
}

/**
 * Draws the taskbar overlay badge with the unread total.
 * @param total Unread total, greater than zero.
 * @returns PNG data URL of the badge.
 */
function drawBadge(total: number): string {
	const size = 32;
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const context = canvas.getContext('2d');
	if (!context) {
		return '';
	}
	const label = total > 99 ? '99+' : String(total);
	context.fillStyle = '#e53935';
	context.beginPath();
	context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
	context.fill();
	context.fillStyle = '#ffffff';
	context.font = `bold ${label.length > 2 ? 12 : 18}px "Segoe UI", sans-serif`;
	context.textAlign = 'center';
	context.textBaseline = 'middle';
	context.fillText(label, size / 2, size / 2 + 1);
	return canvas.toDataURL('image/png');
}

/**
 * Creates an element with a class and, optionally, its text.
 * @param tagName Element tag.
 * @param className CSS class list.
 * @param text Text content.
 * @returns The element.
 */
function createElement<TagName extends keyof HTMLElementTagNameMap>(
	tagName: TagName,
	className = '',
	text = '',
): HTMLElementTagNameMap[TagName] {
	const element = document.createElement(tagName);
	element.className = className;
	element.textContent = text;
	return element;
}

/**
 * Creates a plain button.
 * @param className CSS class list.
 * @param text Button text.
 * @param onClick Click handler.
 * @returns The button.
 */
function createButton(className: string, text: string, onClick: () => void): HTMLButtonElement {
	const button = createElement('button', className, text);
	button.type = 'button';
	button.addEventListener('click', onClick);
	return button;
}

/**
 * Creates a button with an icon and an optional label.
 * @param className CSS class list.
 * @param icon SVG markup from ICONS.
 * @param label Visible text; when empty, used only as tooltip.
 * @param tooltip Tooltip and accessible name.
 * @returns The button.
 */
function createIconButton(className: string, icon: string, label: string, tooltip: string): HTMLButtonElement {
	const button = createElement('button', className);
	button.type = 'button';
	button.title = tooltip;
	button.setAttribute('aria-label', tooltip);
	button.innerHTML = icon;
	if (label) {
		button.append(createElement('span', '', label));
	}
	return button;
}

/**
 * Builds a labelled switch row.
 * @param title Row title.
 * @param description Explanation under the title.
 * @param isChecked Initial value.
 * @param onChange Called when the user flips it.
 * @returns The whole row and its checkbox.
 */
function createToggle(
	title: string,
	description: string,
	isChecked: boolean,
	onChange?: () => void,
): { row: HTMLLabelElement; checkbox: HTMLInputElement } {
	const row = createElement('label', 'toggle-row');
	const text = createElement('span', 'toggle-text');
	text.append(createElement('span', 'toggle-title', title), createElement('span', 'toggle-description', description));
	const switchElement = createElement('span', 'switch');
	const checkbox = createElement('input');
	checkbox.type = 'checkbox';
	checkbox.checked = isChecked;
	if (onChange) {
		checkbox.addEventListener('change', onChange);
	}
	switchElement.append(checkbox, createElement('span', 'switch-track'));
	row.append(text, switchElement);
	return { row, checkbox };
}

/**
 * Builds a labelled text field with room for an error message.
 * @param labelText Label above the field.
 * @param value Initial value.
 * @param placeholder Placeholder shown while empty.
 * @param onEnter Called when the user presses Enter.
 * @returns The field pieces and a function to show or clear an error.
 */
function createTextField(
	labelText: string,
	value: string,
	placeholder: string,
	onEnter: () => void,
): { container: HTMLDivElement; input: HTMLInputElement; setError: (message: string) => void } {
	const container = createElement('div');
	const label = createElement('label', 'modal-section-label', labelText);
	const input = createElement('input', 'text-field');
	input.id = `field-${labelText.toLowerCase().replace(/\W+/g, '-')}`;
	label.htmlFor = input.id;
	input.value = value;
	input.placeholder = placeholder;
	input.spellcheck = false;
	input.addEventListener('keydown', (event) => {
		if (event.key === 'Enter') {
			onEnter();
		}
	});
	const error = createElement('p', 'field-error');
	error.hidden = true;
	const setError = (message: string): void => {
		error.textContent = message;
		error.hidden = !message;
		input.classList.toggle('has-error', Boolean(message));
	};
	input.addEventListener('input', () => setError(''));
	container.append(label, input, error);
	return { container, input, setError };
}

/**
 * Builds a labelled folder picker.
 * @param folders Existing folders.
 * @param selectedFolderId Folder chosen now; null for "no folder".
 * @returns The field pieces.
 */
function createFolderField(
	folders: PrupruFolder[],
	selectedFolderId: string | null,
): { container: HTMLDivElement; select: HTMLSelectElement } {
	const container = createElement('div');
	const label = createElement('label', 'modal-section-label', 'Pasta');
	const select = createElement('select', 'text-field');
	select.id = 'field-folder';
	label.htmlFor = select.id;
	const options = [{ value: '', text: 'Sem pasta' }, ...folders.map((folder) => ({ value: folder.id, text: folder.name }))];
	for (const option of options) {
		const optionElement = createElement('option', '', option.text);
		optionElement.value = option.value;
		select.append(optionElement);
	}
	select.value = selectedFolderId ?? '';
	container.append(label, select);
	container.hidden = folders.length === 0;
	return { container, select };
}

/** Renders the sidebar and its modals and keeps them in sync with the main process. */
function initializeSidebar(): void {
	const accountList = document.querySelector<HTMLUListElement>('#account-list');
	const sidebarResizer = document.querySelector<HTMLElement>('#sidebar-resizer');
	const collapseToggle = document.querySelector<HTMLButtonElement>('#collapse-toggle');
	const doNotDisturbButton = document.querySelector<HTMLButtonElement>('#do-not-disturb-button');
	const newFolderButton = document.querySelector<HTMLButtonElement>('#new-folder-button');
	const settingsButton = document.querySelector<HTMLButtonElement>('#settings-button');
	const emptyState = document.querySelector<HTMLElement>('#empty-state');
	const sleepingState = document.querySelector<HTMLElement>('#sleeping-state');
	const sleepingIcon = document.querySelector<HTMLElement>('#sleeping-icon');
	const sleepingTitle = document.querySelector<HTMLElement>('#sleeping-title');
	const wakeButton = document.querySelector<HTMLButtonElement>('#wake-account');
	const modalRoot = document.querySelector<HTMLElement>('#modal-root');
	const modalElement = document.querySelector<HTMLElement>('#modal');
	const modalSnapshot = document.querySelector<HTMLImageElement>('#modal-snapshot');
	const modalBackdrop = document.querySelector<HTMLElement>('#modal-backdrop');
	const addButtons = document.querySelectorAll<HTMLButtonElement>('#add-account, #add-first-account');
	if (
		!accountList ||
		!sidebarResizer ||
		!collapseToggle ||
		!doNotDisturbButton ||
		!newFolderButton ||
		!settingsButton ||
		!emptyState ||
		!sleepingState ||
		!sleepingIcon ||
		!sleepingTitle ||
		!wakeButton ||
		!modalRoot ||
		!modalElement ||
		!modalSnapshot ||
		!modalBackdrop
	) {
		return;
	}
	const listElement = accountList;
	const toggleButton = collapseToggle;
	const bellButton = doNotDisturbButton;
	const emptyStateElement = emptyState;
	const sleepingStateElement = sleepingState;
	const sleepingTitleElement = sleepingTitle;
	const rootElement = modalRoot;
	const dialogElement = modalElement;
	const snapshotElement = modalSnapshot;

	let currentState: PrupruState = {
		accounts: [],
		folders: [],
		activeId: null,
		unread: {},
		favicons: {},
		hibernatedIds: [],
		serviceTypes: [],
		sidebarCollapsed: false,
		sidebarWidth: 220,
		sidebarWidthRange: { min: 180, max: 380, default: 220 },
		theme: 'system',
		isOpenAtLogin: false,
		doNotDisturb: { until: null, isScheduleEnabled: false, scheduleStart: '19:00', scheduleEnd: '08:00' },
		isDoNotDisturbActive: false,
	};
	let lastBadgeTotal = 0;
	let isModalVisible = false;
	/** Row being dragged: an account (to reorder or move between folders) or a folder (to reorder). */
	let draggedItem: { kind: 'account' | 'folder'; id: string } | null = null;
	let modalClosingTimer: number | null = null;
	let isResizingSidebar = false;
	/** What the last render drew, to animate only what changed: new rows, a new active account, a higher counter. */
	let renderedRowKeys: Set<string> | null = null;
	let renderedActiveId: string | null = null;
	let renderedUnread: Record<string, number> = {};

	sleepingIcon.innerHTML = ICONS.moon;
	settingsButton.innerHTML = ICONS.settings;
	settingsButton.title = 'Configurações';
	newFolderButton.innerHTML = ICONS.folderPlus;
	newFolderButton.title = 'Nova pasta';

	/**
	 * Finds the catalog summary of a service.
	 * @param type Service type id.
	 * @returns The summary, or undefined before the first state arrives.
	 */
	function findServiceType(type: PrupruServiceTypeId): PrupruServiceSummary | undefined {
		return currentState.serviceTypes.find((serviceType) => serviceType.id === type);
	}

	/**
	 * Tells whether an account is unloaded from memory.
	 * @param id Account id.
	 * @returns True when hibernated.
	 */
	function isHibernated(id: string): boolean {
		return currentState.hibernatedIds.includes(id);
	}

	/**
	 * Returns the domain of a custom site for display.
	 * @param url Site address.
	 * @returns The domain without "www.", or the address itself when it cannot be parsed.
	 */
	function getDisplayDomain(url: string): string {
		try {
			return new URL(url).hostname.replace(/^www\./, '');
		} catch {
			return url;
		}
	}

	/**
	 * Builds an avatar: a favicon when one is known, an icon or colored initials otherwise.
	 * @param faviconUrl Favicon URL, if any.
	 * @param color Background color for the initials.
	 * @param text Text the initials come from.
	 * @param icon SVG drawn instead of the initials.
	 * @returns The avatar element.
	 */
	function createAvatar(faviconUrl: string | undefined, color: string, text: string, icon?: string): HTMLSpanElement {
		const avatar = createElement('span', 'avatar');
		if (faviconUrl) {
			avatar.classList.add('has-favicon');
			const favicon = createElement('img');
			favicon.src = faviconUrl;
			favicon.alt = '';
			favicon.draggable = false;
			avatar.append(favicon);
		} else {
			avatar.style.background = color;
			if (icon) {
				avatar.innerHTML = icon;
			} else {
				avatar.textContent = getInitials(text);
			}
		}
		return avatar;
	}

	/**
	 * Builds the avatar of an account.
	 * @param account Account to draw.
	 * @returns The avatar element.
	 */
	function createAccountAvatar(account: PrupruAccount): HTMLSpanElement {
		const serviceType = findServiceType(account.type);
		const iconUrl = currentState.favicons[account.id] ?? serviceType?.iconDataUrl ?? undefined;
		return createAvatar(iconUrl, serviceType?.color ?? '', account.name);
	}

	/**
	 * Builds the avatar of a service in the add modal from its bundled icon.
	 * @param serviceType Service to draw.
	 * @returns The avatar element.
	 */
	function createServiceAvatar(serviceType: PrupruServiceSummary): HTMLSpanElement {
		if (serviceType.id === 'custom') {
			return createAvatar(undefined, serviceType.color, serviceType.label, ICONS.globe);
		}
		return createAvatar(serviceType.iconDataUrl ?? undefined, serviceType.color, serviceType.label);
	}

	/**
	 * Builds the subtitle of an account: its service (or site domain), plus its status.
	 * @param account Account to describe.
	 * @returns The subtitle text.
	 */
	function describeAccount(account: PrupruAccount): string {
		const serviceLabel =
			account.type === 'custom' && account.url
				? getDisplayDomain(account.url)
				: (findServiceType(account.type)?.label ?? '');
		const statuses = [serviceLabel];
		if (isHibernated(account.id)) {
			statuses.push('hibernado');
		}
		if (account.isMuted) {
			statuses.push('silenciado');
		}
		return statuses.join(' · ');
	}

	/**
	 * Opens the modal, hiding the service views and blurring a picture of the active one behind it.
	 * @param buildContent Fills the modal.
	 */
	async function openModal(buildContent: (modal: HTMLElement) => void): Promise<void> {
		if (isModalVisible) {
			return;
		}
		isModalVisible = true;
		const isReopeningWhileClosing = modalClosingTimer !== null;
		if (modalClosingTimer !== null) {
			// The views are still hidden behind the fading modal, so the picture already shown stays valid.
			window.clearTimeout(modalClosingTimer);
			modalClosingTimer = null;
		}
		// The backdrop picture is optional: without it the modal still has to open, or every button would stay dead.
		const snapshot = await window.prupru.setModalOpen(true).catch((): null => null);
		if (snapshot) {
			snapshotElement.src = snapshot;
		} else if (!isReopeningWhileClosing) {
			snapshotElement.removeAttribute('src');
		}
		dialogElement.replaceChildren();
		try {
			buildContent(dialogElement);
		} catch (error) {
			isModalVisible = false;
			void window.prupru.setModalOpen(false);
			throw error;
		}
		rootElement.hidden = false;
		// Reading the layout commits the hidden state, so the class below starts the fade-in transition.
		void rootElement.offsetWidth;
		rootElement.classList.add('is-visible');
		dialogElement.querySelector<HTMLElement>('[data-autofocus]')?.focus();
	}

	/** Fades the modal out, then hides it and brings the service views back. */
	function closeModal(): void {
		if (!isModalVisible) {
			return;
		}
		isModalVisible = false;
		rootElement.classList.remove('is-visible');
		modalClosingTimer = window.setTimeout(() => {
			modalClosingTimer = null;
			rootElement.hidden = true;
			snapshotElement.removeAttribute('src');
			dialogElement.replaceChildren();
			void window.prupru.setModalOpen(false);
		}, MODAL_TRANSITION_MS);
	}

	/**
	 * Rebuilds the open modal in place, keeping it open; the new content slides in.
	 * @param buildContent Fills the modal.
	 */
	function refreshModal(buildContent: (modal: HTMLElement) => void): void {
		dialogElement.replaceChildren();
		buildContent(dialogElement);
		dialogElement.classList.remove('is-swapping');
		void dialogElement.offsetWidth;
		dialogElement.classList.add('is-swapping');
	}

	/**
	 * Builds the modal header with an optional avatar and a close button.
	 * @param title Title text.
	 * @param subtitle Subtitle text.
	 * @param avatar Avatar shown before the title.
	 * @returns The header element.
	 */
	function createModalHeader(title: string, subtitle: string, avatar?: HTMLElement): HTMLElement {
		const header = createElement('header', 'modal-header');
		if (avatar) {
			header.append(avatar);
		}
		const titles = createElement('div', 'modal-titles');
		titles.append(createElement('h2', 'modal-title', title), createElement('p', 'modal-subtitle', subtitle));
		const closeButton = createIconButton('icon-button', ICONS.close, '', 'Fechar');
		closeButton.addEventListener('click', closeModal);
		header.append(titles, closeButton);
		return header;
	}

	/**
	 * Builds a modal footer: optional left content, then the buttons on the right.
	 * @param buttons Buttons aligned to the right.
	 * @param leftContent Element aligned to the left.
	 * @returns The footer element.
	 */
	function createModalFooter(buttons: HTMLElement[], leftContent?: HTMLElement): HTMLElement {
		const footer = createElement('footer', 'modal-footer');
		if (leftContent) {
			footer.append(leftContent);
		}
		footer.append(createElement('span', 'spacer'), ...buttons);
		return footer;
	}

	/**
	 * Fills the modal used to add a service.
	 * @param modal Modal element.
	 */
	function buildAddModal(modal: HTMLElement): void {
		let selectedType: PrupruServiceSummary | null = null;
		let isToggleTouched = false;

		const submit = async (): Promise<void> => {
			if (!selectedType) {
				return;
			}
			const isCustom = selectedType.id === 'custom';
			if (isCustom && !urlField.input.value.trim()) {
				urlField.setError('Informe o endereço do site.');
				urlField.input.focus();
				return;
			}
			submitButton.disabled = true;
			const isAdded = await window.prupru.addAccount({
				type: selectedType.id,
				name: nameField.input.value,
				autoHibernate: hibernationToggle.checkbox.checked,
				folderId: folderField.select.value || null,
				...(isCustom ? { url: urlField.input.value } : {}),
			});
			if (!isAdded) {
				submitButton.disabled = false;
				urlField.setError(INVALID_URL_MESSAGE);
				urlField.input.focus();
				return;
			}
			closeModal();
		};

		const submitButton = createButton('primary-button', 'Adicionar', () => void submit());
		submitButton.disabled = true;

		const urlField = createTextField('Endereço do site', '', 'Ex.: trello.com', () => void submit());
		urlField.container.hidden = true;
		const nameField = createTextField('Nome', '', 'Escolha um serviço acima', () => void submit());
		nameField.input.maxLength = 40;
		const hibernationToggle = createToggle('Hibernar automaticamente', HIBERNATION_DESCRIPTION, false, () => {
			isToggleTouched = true;
		});
		const folderField = createFolderField(currentState.folders, null);

		const grid = createElement('div', 'service-grid');
		const tiles: HTMLButtonElement[] = [];
		for (const serviceType of currentState.serviceTypes) {
			const tile = createElement('button', 'service-tile');
			tile.type = 'button';
			tile.append(createServiceAvatar(serviceType), createElement('span', 'service-tile-label', serviceType.label));
			tile.addEventListener('click', () => {
				selectedType = serviceType;
				for (const otherTile of tiles) {
					otherTile.classList.toggle('is-selected', otherTile === tile);
				}
				if (!isToggleTouched) {
					hibernationToggle.checkbox.checked = serviceType.hibernateByDefault;
				}
				const isCustom = serviceType.id === 'custom';
				urlField.container.hidden = !isCustom;
				nameField.input.placeholder = isCustom ? 'Ex.: Trello do time' : serviceType.label;
				submitButton.disabled = false;
				if (isCustom) {
					urlField.input.focus();
				}
			});
			tile.addEventListener('dblclick', () => void submit());
			tiles.push(tile);
			grid.append(tile);
		}
		tiles[0]?.setAttribute('data-autofocus', '');

		modal.append(
			createModalHeader('Adicionar serviço', 'Cada serviço abre com o seu próprio login.'),
			createElement('span', 'modal-section-label', 'Serviço'),
			grid,
			urlField.container,
			nameField.container,
			folderField.container,
			hibernationToggle.row,
			createModalFooter([createButton('secondary-button', 'Cancelar', closeModal), submitButton]),
		);
	}

	/**
	 * Fills the modal with the settings and actions of an account.
	 * @param modal Modal element.
	 * @param account Account to manage.
	 */
	function buildAccountModal(modal: HTMLElement, account: PrupruAccount): void {
		const isAsleep = isHibernated(account.id);
		const isCustom = account.type === 'custom';

		const save = async (): Promise<void> => {
			const isSaved = await window.prupru.updateAccount(account.id, {
				name: nameField.input.value,
				autoHibernate: hibernationToggle.checkbox.checked,
				isMuted: muteToggle.checkbox.checked,
				folderId: folderField.select.value || null,
				...(isCustom ? { url: urlField.input.value } : {}),
			});
			if (!isSaved) {
				urlField.setError(INVALID_URL_MESSAGE);
				urlField.input.focus();
				return;
			}
			closeModal();
		};

		const nameField = createTextField('Nome', account.name, account.name, () => void save());
		nameField.input.maxLength = 40;
		nameField.input.setAttribute('data-autofocus', '');
		const urlField = createTextField('Endereço do site', account.url ?? '', 'Ex.: trello.com', () => void save());
		urlField.container.hidden = !isCustom;
		const hibernationToggle = createToggle('Hibernar automaticamente', HIBERNATION_DESCRIPTION, account.autoHibernate);
		const muteToggle = createToggle('Silenciar notificações', MUTE_DESCRIPTION, account.isMuted);
		const folderField = createFolderField(currentState.folders, account.folderId);

		const reloadButton = createIconButton('secondary-button with-icon', ICONS.reload, 'Recarregar', 'Recarregar');
		reloadButton.disabled = isAsleep;
		reloadButton.addEventListener('click', () => {
			void window.prupru.reloadAccount(account.id);
			closeModal();
		});
		const sleepButton = isAsleep
			? createIconButton('secondary-button with-icon', ICONS.sun, 'Acordar', 'Acordar')
			: createIconButton('secondary-button with-icon', ICONS.moon, 'Hibernar agora', 'Hibernar agora');
		sleepButton.addEventListener('click', () => {
			void (isAsleep ? window.prupru.selectAccount(account.id) : window.prupru.hibernateAccount(account.id));
			closeModal();
		});
		const quickActions = createElement('div', 'quick-actions');
		quickActions.append(reloadButton, sleepButton);

		const removeButton = createButton('ghost-danger-button', 'Remover', () =>
			refreshModal((content) => buildRemoveConfirmation(content, account)),
		);

		modal.append(
			createModalHeader(account.name, describeAccount(account), createAccountAvatar(account)),
			nameField.container,
			urlField.container,
			folderField.container,
			hibernationToggle.row,
			muteToggle.row,
			quickActions,
			createModalFooter(
				[createButton('secondary-button', 'Cancelar', closeModal), createButton('primary-button', 'Salvar', () => void save())],
				removeButton,
			),
		);
	}

	/**
	 * Replaces the account modal with the removal confirmation.
	 * @param modal Modal element.
	 * @param account Account to remove.
	 */
	function buildRemoveConfirmation(modal: HTMLElement, account: PrupruAccount): void {
		const backButton = createButton('secondary-button', 'Voltar', () =>
			refreshModal((content) => buildAccountModal(content, account)),
		);
		const confirmButton = createButton('danger-button', 'Remover conta', async () => {
			confirmButton.disabled = true;
			await window.prupru.removeAccount(account.id);
			closeModal();
		});

		modal.append(
			createModalHeader(`Remover "${account.name}"?`, describeAccount(account), createAccountAvatar(account)),
			createElement(
				'p',
				'confirm-text',
				'A conta será desconectada deste computador e os dados dela aqui serão apagados. Nos outros aparelhos, ela continua funcionando normalmente.',
			),
			createModalFooter([backButton, confirmButton]),
		);
		backButton.focus();
	}

	/**
	 * Fills the app settings modal: theme and starting with Windows. Changes apply at once.
	 * @param modal Modal element.
	 */
	function buildSettingsModal(modal: HTMLElement): void {
		const themeSection = createElement('section', 'modal-section');
		const segmented = createElement('div', 'segmented');
		for (const option of THEME_OPTIONS) {
			const optionButton = createButton(option.value === currentState.theme ? 'is-selected' : '', option.label, async () => {
				await window.prupru.setTheme(option.value);
				refreshModal(buildSettingsModal);
			});
			segmented.append(optionButton);
		}
		themeSection.append(createElement('span', 'modal-section-label', 'Aparência'), segmented);

		const systemSection = createElement('section', 'modal-section');
		const startupToggle = createToggle(
			'Iniciar com o Windows',
			'Abre minimizado ao lado do relógio quando o computador liga.',
			currentState.isOpenAtLogin,
			() => void window.prupru.setOpenAtLogin(startupToggle.checkbox.checked),
		);
		systemSection.append(createElement('span', 'modal-section-label', 'Sistema'), startupToggle.row);

		modal.append(
			createModalHeader('Configurações', 'As mudanças valem na hora.'),
			themeSection,
			systemSection,
			createModalFooter([createButton('primary-button', 'Fechar', closeModal)]),
		);
	}

	/**
	 * Describes the do not disturb status for the modal and the bell tooltip.
	 * @returns A short sentence.
	 */
	function describeDoNotDisturb(): string {
		const { until, isScheduleEnabled, scheduleStart, scheduleEnd } = currentState.doNotDisturb;
		if (!currentState.isDoNotDisturbActive) {
			return isScheduleEnabled ? `Desligado agora · programado das ${scheduleStart} às ${scheduleEnd}` : 'Desligado';
		}
		if (until !== null && until > Date.now()) {
			return `Ativo até ${formatPauseEnd(until)}`;
		}
		return `Ativo pelo horário programado, até ${scheduleEnd}`;
	}

	/**
	 * Saves new do not disturb settings and redraws the modal with the result.
	 * @param changes Fields to change.
	 */
	async function updateDoNotDisturb(changes: Partial<PrupruDoNotDisturb>): Promise<void> {
		await window.prupru.setDoNotDisturb({ ...currentState.doNotDisturb, ...changes });
		refreshModal(buildDoNotDisturbModal);
	}

	/**
	 * Fills the do not disturb modal: quick pauses and a daily schedule. Changes apply at once.
	 * @param modal Modal element.
	 */
	function buildDoNotDisturbModal(modal: HTMLElement): void {
		const { until, isScheduleEnabled, scheduleStart, scheduleEnd } = currentState.doNotDisturb;
		const isPaused = until !== null && until > Date.now();

		const status = createElement('div', currentState.isDoNotDisturbActive ? 'status-pill is-on' : 'status-pill');
		status.innerHTML = currentState.isDoNotDisturbActive ? ICONS.bellOff : ICONS.bell;
		status.append(createElement('span', '', describeDoNotDisturb()));

		const pauseSection = createElement('section', 'modal-section');
		const pauseOptions = createElement('div', 'pause-options');
		pauseOptions.append(
			createButton('secondary-button', 'Por 1 hora', () => void updateDoNotDisturb({ until: Date.now() + 60 * 60 * 1000 })),
			createButton('secondary-button', 'Até 8h', () => void updateDoNotDisturb({ until: getNextMorning() })),
		);
		const resumeButton = createButton('secondary-button', 'Retomar', () => void updateDoNotDisturb({ until: null }));
		resumeButton.disabled = !isPaused;
		pauseOptions.append(resumeButton);
		pauseSection.append(createElement('span', 'modal-section-label', 'Pausar agora'), pauseOptions);

		const scheduleSection = createElement('section', 'modal-section');
		const scheduleToggle = createToggle(
			'Horário programado',
			'Silencia todos os dias no período abaixo.',
			isScheduleEnabled,
			() => void updateDoNotDisturb({ isScheduleEnabled: scheduleToggle.checkbox.checked }),
		);
		const times = createElement('div', 'schedule-times');
		const createTimeInput = (value: string, field: 'scheduleStart' | 'scheduleEnd'): HTMLInputElement => {
			const input = createElement('input', 'text-field');
			input.type = 'time';
			input.value = value;
			input.disabled = !isScheduleEnabled;
			input.addEventListener('change', () => {
				if (input.value) {
					void updateDoNotDisturb({ [field]: input.value });
				}
			});
			return input;
		};
		times.append(
			createElement('span', '', 'Das'),
			createTimeInput(scheduleStart, 'scheduleStart'),
			createElement('span', '', 'às'),
			createTimeInput(scheduleEnd, 'scheduleEnd'),
		);
		scheduleSection.append(createElement('span', 'modal-section-label', 'Todo dia'), scheduleToggle.row, times);

		modal.append(
			createModalHeader('Não perturbe', 'Silencia as notificações de todos os serviços.'),
			status,
			pauseSection,
			scheduleSection,
			createElement(
				'p',
				'modal-note',
				'O serviço que está na tela continua com som, para você não perder uma chamada que atendeu. Os contadores de não lidas continuam aparecendo.',
			),
			createModalFooter([createButton('primary-button', 'Fechar', closeModal)]),
		);
	}

	/**
	 * Describes how many services a folder holds.
	 * @param count Number of accounts.
	 * @returns "1 serviço" or "N serviços".
	 */
	function describeServiceCount(count: number): string {
		return count === 1 ? '1 serviço' : `${count} serviços`;
	}

	/**
	 * Fills the modal used to create a folder.
	 * @param modal Modal element.
	 */
	function buildNewFolderModal(modal: HTMLElement): void {
		const create = async (): Promise<void> => {
			await window.prupru.createFolder(nameField.input.value);
			closeModal();
		};
		const nameField = createTextField('Nome', '', 'Ex.: Trabalho', () => void create());
		nameField.input.maxLength = 30;
		nameField.input.setAttribute('data-autofocus', '');

		modal.append(
			createModalHeader('Nova pasta', 'Agrupe serviços, como Trabalho e Pessoal. Depois, arraste as contas para dentro dela.'),
			nameField.container,
			createModalFooter([
				createButton('secondary-button', 'Cancelar', closeModal),
				createButton('primary-button', 'Criar pasta', () => void create()),
			]),
		);
	}

	/**
	 * Fills the modal with the settings of a folder.
	 * @param modal Modal element.
	 * @param folder Folder to manage.
	 */
	function buildFolderModal(modal: HTMLElement, folder: PrupruFolder): void {
		const accountCount = currentState.accounts.filter((account) => account.folderId === folder.id).length;
		const save = async (): Promise<void> => {
			await window.prupru.updateFolder(folder.id, { name: nameField.input.value });
			closeModal();
		};
		const nameField = createTextField('Nome', folder.name, folder.name, () => void save());
		nameField.input.maxLength = 30;
		nameField.input.setAttribute('data-autofocus', '');

		const deleteButton = createButton('ghost-danger-button', 'Excluir pasta', () =>
			refreshModal((content) => buildDeleteFolderConfirmation(content, folder)),
		);
		modal.append(
			createModalHeader(folder.name, describeServiceCount(accountCount)),
			nameField.container,
			createModalFooter(
				[createButton('secondary-button', 'Cancelar', closeModal), createButton('primary-button', 'Salvar', () => void save())],
				deleteButton,
			),
		);
	}

	/**
	 * Replaces the folder modal with the deletion confirmation.
	 * @param modal Modal element.
	 * @param folder Folder to delete.
	 */
	function buildDeleteFolderConfirmation(modal: HTMLElement, folder: PrupruFolder): void {
		const backButton = createButton('secondary-button', 'Voltar', () =>
			refreshModal((content) => buildFolderModal(content, folder)),
		);
		const confirmButton = createButton('danger-button', 'Excluir pasta', async () => {
			confirmButton.disabled = true;
			await window.prupru.deleteFolder(folder.id);
			closeModal();
		});
		modal.append(
			createModalHeader(`Excluir "${folder.name}"?`, 'Só a pasta é excluída.'),
			createElement(
				'p',
				'confirm-text',
				'Os serviços desta pasta continuam no app, com o login salvo. Eles voltam para cima, fora das pastas.',
			),
			createModalFooter([backButton, confirmButton]),
		);
		backButton.focus();
	}

	/** Removes the drop markers from every row. */
	function clearDropMarkers(): void {
		for (const row of listElement.querySelectorAll('.drop-before, .drop-after, .drop-into')) {
			row.classList.remove('drop-before', 'drop-after', 'drop-into');
		}
	}

	/**
	 * Tells whether the pointer is on the lower half of a row.
	 * @param row Row under the pointer.
	 * @param event Drag event.
	 * @returns True for the lower half.
	 */
	function isPointerOnLowerHalf(row: HTMLElement, event: DragEvent): boolean {
		const bounds = row.getBoundingClientRect();
		return event.clientY > bounds.top + bounds.height / 2;
	}

	/**
	 * Moves an account in the list and sends the new arrangement.
	 * @param movedId Account being moved.
	 * @param folderId Folder it goes to; null for no folder.
	 * @param anchorId Account it was dropped next to; null puts it at the end of the folder.
	 * @param isAfter Whether it goes after the anchor.
	 */
	function moveAccount(movedId: string, folderId: string | null, anchorId: string | null, isAfter: boolean): void {
		const placements = currentState.accounts
			.filter((account) => account.id !== movedId)
			.map((account) => ({ id: account.id, folderId: account.folderId }));
		const movedPlacement = { id: movedId, folderId };
		if (anchorId) {
			const anchorIndex = placements.findIndex((placement) => placement.id === anchorId);
			placements.splice(anchorIndex + (isAfter ? 1 : 0), 0, movedPlacement);
		} else {
			const lastIndexInFolder = placements.findLastIndex((placement) => placement.folderId === folderId);
			placements.splice(lastIndexInFolder === -1 ? placements.length : lastIndexInFolder + 1, 0, movedPlacement);
		}
		void window.prupru.arrangeAccounts(placements);
	}

	/**
	 * Builds the strip shown below the list while an account in a folder is dragged; dropping there takes it out.
	 * @returns The drop zone.
	 */
	function createUnfiledDropZone(): HTMLLIElement {
		const zone = createElement('li', 'unfiled-drop-zone', 'Solte aqui para tirar da pasta');
		zone.addEventListener('dragover', (event) => {
			if (draggedItem?.kind !== 'account') {
				return;
			}
			event.preventDefault();
			zone.classList.add('drop-into');
		});
		zone.addEventListener('dragleave', () => zone.classList.remove('drop-into'));
		zone.addEventListener('drop', (event) => {
			event.preventDefault();
			if (draggedItem?.kind === 'account') {
				moveAccount(draggedItem.id, null, null, false);
			}
		});
		return zone;
	}

	/**
	 * Lets a row be dragged and keeps track of it until the drop.
	 * @param row Account row or folder header.
	 * @param kind What the row is.
	 * @param id Account or folder id.
	 */
	function makeDraggable(row: HTMLLIElement, kind: 'account' | 'folder', id: string): void {
		row.draggable = true;
		row.addEventListener('dragstart', (event) => {
			draggedItem = { kind, id };
			event.dataTransfer?.setData('text/plain', id);
			if (event.dataTransfer) {
				event.dataTransfer.effectAllowed = 'move';
			}
			row.classList.add('is-dragging');
			const account = kind === 'account' ? currentState.accounts.find((candidate) => candidate.id === id) : undefined;
			if (account?.folderId) {
				// Chromium cancels a drag whose page changes layout inside dragstart, so the zone comes right after,
				// and at the end of the list, so the rows under the pointer do not move while dragging.
				window.setTimeout(() => {
					if (draggedItem?.id === id) {
						listElement.append(createUnfiledDropZone());
					}
				}, 0);
			}
		});
		row.addEventListener('dragend', () => {
			draggedItem = null;
			clearDropMarkers();
			// State that arrived during the drag was held back, so draw it now.
			render();
		});
	}

	/**
	 * Lets an account row receive another account, before or after it and in its folder.
	 * @param item Account row.
	 * @param account Account of the row.
	 */
	function acceptAccountDrops(item: HTMLLIElement, account: PrupruAccount): void {
		item.addEventListener('dragover', (event) => {
			if (draggedItem?.kind !== 'account' || draggedItem.id === account.id) {
				return;
			}
			event.preventDefault();
			clearDropMarkers();
			item.classList.add(isPointerOnLowerHalf(item, event) ? 'drop-after' : 'drop-before');
		});
		item.addEventListener('dragleave', () => item.classList.remove('drop-before', 'drop-after'));
		item.addEventListener('drop', (event) => {
			event.preventDefault();
			if (draggedItem?.kind !== 'account' || draggedItem.id === account.id) {
				return;
			}
			moveAccount(draggedItem.id, account.folderId, account.id, item.classList.contains('drop-after'));
		});
	}

	/**
	 * Builds the header of a folder: click opens or closes it, accounts dropped on it go inside,
	 * and other folders dropped on it change the folder order.
	 * @param folder Folder to show.
	 * @returns The header row.
	 */
	function createFolderHeader(folder: PrupruFolder): HTMLLIElement {
		const folderAccounts = currentState.accounts.filter((account) => account.folderId === folder.id);
		const header = createElement('li', folder.isCollapsed ? 'folder-header is-collapsed' : 'folder-header');
		if (folder.isCollapsed && folderAccounts.some((account) => account.id === currentState.activeId)) {
			header.classList.add('has-active');
		}
		header.title = `${folder.name} — ${describeServiceCount(folderAccounts.length)}`;

		const chevron = createElement('span', 'folder-chevron');
		chevron.innerHTML = ICONS.chevron;
		header.append(
			chevron,
			createElement('span', 'folder-name', folder.name),
			createElement('span', 'folder-short-name', folder.name.slice(0, 3)),
		);
		const unreadTotal = folderAccounts.reduce((sum, account) => sum + (currentState.unread[account.id] ?? 0), 0);
		if (folder.isCollapsed && unreadTotal > 0) {
			header.append(createElement('span', 'unread-badge', unreadTotal > 99 ? '99+' : String(unreadTotal)));
		}
		const moreButton = createIconButton('icon-button more-button', ICONS.more, '', 'Opções da pasta');
		moreButton.addEventListener('click', (event) => {
			event.stopPropagation();
			void openModal((modal) => buildFolderModal(modal, folder));
		});
		header.append(moreButton);
		header.dataset.rowKey = `folder:${folder.id}`;
		header.addEventListener('click', () => {
			if (folder.isCollapsed) {
				void window.prupru.updateFolder(folder.id, { isCollapsed: false });
				return;
			}
			// The rows slide out first; the folder closes once they are gone.
			header.classList.add('is-collapsed');
			for (const row of listElement.querySelectorAll(`[data-folder-id="${folder.id}"]`)) {
				row.classList.add('is-leaving');
			}
			window.setTimeout(() => void window.prupru.updateFolder(folder.id, { isCollapsed: true }), ROW_ANIMATION_MS);
		});

		makeDraggable(header, 'folder', folder.id);
		header.addEventListener('dragover', (event) => {
			if (!draggedItem || (draggedItem.kind === 'folder' && draggedItem.id === folder.id)) {
				return;
			}
			event.preventDefault();
			clearDropMarkers();
			if (draggedItem.kind === 'account') {
				header.classList.add('drop-into');
			} else {
				header.classList.add(isPointerOnLowerHalf(header, event) ? 'drop-after' : 'drop-before');
			}
		});
		header.addEventListener('dragleave', () => header.classList.remove('drop-before', 'drop-after', 'drop-into'));
		header.addEventListener('drop', (event) => {
			event.preventDefault();
			if (!draggedItem) {
				return;
			}
			if (draggedItem.kind === 'account') {
				moveAccount(draggedItem.id, folder.id, null, false);
				return;
			}
			const movedFolderId = draggedItem.id;
			if (movedFolderId === folder.id) {
				return;
			}
			const isAfter = header.classList.contains('drop-after');
			const folderIds = currentState.folders.map((candidate) => candidate.id).filter((id) => id !== movedFolderId);
			folderIds.splice(folderIds.indexOf(folder.id) + (isAfter ? 1 : 0), 0, movedFolderId);
			void window.prupru.reorderFolders(folderIds);
		});
		return header;
	}

	/**
	 * Builds one row of the account list.
	 * @param account Account to show.
	 * @returns The list item.
	 */
	function createAccountItem(account: PrupruAccount): HTMLLIElement {
		const classNames = ['account'];
		if (account.folderId) {
			classNames.push('in-folder');
		}
		if (account.id === currentState.activeId) {
			classNames.push('active');
		}
		if (isHibernated(account.id)) {
			classNames.push('is-hibernated');
		}
		if (account.id === currentState.activeId && renderedRowKeys && renderedActiveId !== account.id) {
			classNames.push('is-activating');
		}
		const item = createElement('li', classNames.join(' '));
		item.title = `${account.name} — ${describeAccount(account)}`;
		item.dataset.rowKey = `account:${account.id}`;
		if (account.folderId) {
			item.dataset.folderId = account.folderId;
		}

		const avatar = createAccountAvatar(account);
		const hasSiblingOfSameService = currentState.accounts.some(
			(otherAccount) => otherAccount.id !== account.id && otherAccount.type === account.type,
		);
		const hasIcon = Boolean(currentState.favicons[account.id] ?? findServiceType(account.type)?.iconDataUrl);
		// With the sidebar collapsed, the initials are all that tells two WhatsApp icons apart.
		if (hasSiblingOfSameService && hasIcon) {
			avatar.append(createElement('span', 'avatar-initials', getInitials(account.name)));
		}
		if (isHibernated(account.id)) {
			const sleepMark = createElement('span', 'sleep-mark');
			sleepMark.innerHTML = ICONS.moon;
			avatar.append(sleepMark);
		} else if (account.isMuted) {
			const muteMark = createElement('span', 'sleep-mark');
			muteMark.innerHTML = ICONS.bellOff;
			avatar.append(muteMark);
		}
		const details = createElement('span', 'account-details');
		details.append(
			createElement('span', 'account-name', account.name),
			createElement('span', 'account-subtitle', describeAccount(account)),
		);
		item.append(avatar, details);

		const unreadCount = currentState.unread[account.id] ?? 0;
		if (unreadCount > 0) {
			const unreadBadge = createElement('span', 'unread-badge', unreadCount > 99 ? '99+' : String(unreadCount));
			if (renderedRowKeys && unreadCount > (renderedUnread[account.id] ?? 0)) {
				unreadBadge.classList.add('is-bumped');
			}
			item.append(unreadBadge);
		}

		const moreButton = createIconButton('icon-button more-button', ICONS.more, '', 'Opções');
		moreButton.addEventListener('click', (event) => {
			event.stopPropagation();
			void openModal((modal) => buildAccountModal(modal, account));
		});
		item.append(moreButton);

		item.addEventListener('click', () => void window.prupru.selectAccount(account.id));
		makeDraggable(item, 'account', account.id);
		acceptAccountDrops(item, account);
		return item;
	}

	/** Sends the taskbar badge when the unread total changed. */
	function refreshBadge(): void {
		const total = Object.values(currentState.unread).reduce((sum, count) => sum + count, 0);
		if (total === lastBadgeTotal) {
			return;
		}
		lastBadgeTotal = total;
		window.prupru.setBadge(total > 0 ? drawBadge(total) : null, total);
	}

	/**
	 * Sets the width of the expanded sidebar on the page.
	 * @param width Width in pixels.
	 */
	function applySidebarWidth(width: number): void {
		document.documentElement.style.setProperty('--sidebar-width', `${width}px`);
	}

	/**
	 * Keeps a dragged width inside the range the main process accepts.
	 * @param width Width under the pointer.
	 * @returns The width, limited to the range.
	 */
	function clampSidebarWidth(width: number): number {
		const { min, max } = currentState.sidebarWidthRange;
		return Math.round(Math.min(Math.max(width, min), max));
	}

	/**
	 * Lets the user drag the sidebar edge to change its width; a double click goes back to the default.
	 * The page follows the pointer at once, and the service view follows once per frame.
	 * @param handle Strip on the sidebar edge.
	 */
	function enableSidebarResizing(handle: HTMLElement): void {
		let lastWidth = currentState.sidebarWidth;
		let isFrameQueued = false;
		const finishResizing = (): void => {
			if (!isResizingSidebar) {
				return;
			}
			isResizingSidebar = false;
			document.body.classList.remove('is-resizing-sidebar');
			window.prupru.resizeSidebar(lastWidth, true);
		};
		handle.addEventListener('pointerdown', (event) => {
			if (currentState.sidebarCollapsed || event.button !== 0) {
				return;
			}
			event.preventDefault();
			handle.setPointerCapture(event.pointerId);
			isResizingSidebar = true;
			lastWidth = currentState.sidebarWidth;
			document.body.classList.add('is-resizing-sidebar');
		});
		handle.addEventListener('pointermove', (event) => {
			if (!isResizingSidebar) {
				return;
			}
			lastWidth = clampSidebarWidth(event.clientX);
			applySidebarWidth(lastWidth);
			if (!isFrameQueued) {
				isFrameQueued = true;
				requestAnimationFrame(() => {
					isFrameQueued = false;
					if (isResizingSidebar) {
						window.prupru.resizeSidebar(lastWidth, false);
					}
				});
			}
		});
		handle.addEventListener('pointerup', finishResizing);
		handle.addEventListener('pointercancel', finishResizing);
		handle.addEventListener('dblclick', () => {
			const defaultWidth = currentState.sidebarWidthRange.default;
			applySidebarWidth(defaultWidth);
			window.prupru.resizeSidebar(defaultWidth, true);
		});
	}

	/** Redraws the sidebar and the content placeholders from the current state. */
	function render(): void {
		document.body.classList.toggle('sidebar-collapsed', currentState.sidebarCollapsed);
		if (!isResizingSidebar) {
			applySidebarWidth(currentState.sidebarWidth);
		}
		toggleButton.innerHTML = currentState.sidebarCollapsed ? ICONS.expand : ICONS.collapse;
		toggleButton.title = currentState.sidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral';
		bellButton.innerHTML = currentState.isDoNotDisturbActive ? ICONS.bellOff : ICONS.bell;
		bellButton.classList.toggle('is-on', currentState.isDoNotDisturbActive);
		bellButton.title = `Não perturbe: ${describeDoNotDisturb()}`;

		const rows = currentState.accounts.filter((account) => !account.folderId).map(createAccountItem);
		for (const folder of currentState.folders) {
			rows.push(createFolderHeader(folder));
			if (!folder.isCollapsed) {
				rows.push(...currentState.accounts.filter((account) => account.folderId === folder.id).map(createAccountItem));
			}
		}
		const previousRowKeys = renderedRowKeys;
		if (previousRowKeys) {
			for (const row of rows) {
				if (!previousRowKeys.has(row.dataset.rowKey ?? '')) {
					row.classList.add('is-entering');
				}
			}
		}
		listElement.replaceChildren(...rows);
		renderedRowKeys = new Set(rows.map((row) => row.dataset.rowKey ?? ''));
		renderedActiveId = currentState.activeId;
		renderedUnread = { ...currentState.unread };

		const activeAccount = currentState.accounts.find((account) => account.id === currentState.activeId);
		emptyStateElement.hidden = currentState.accounts.length > 0;
		sleepingStateElement.hidden = !activeAccount || !isHibernated(activeAccount.id);
		sleepingTitleElement.textContent = activeAccount ? `${activeAccount.name} está hibernando` : '';

		refreshBadge();
	}

	/**
	 * Applies a state received from the main process; while a row is being dragged, drawing waits for the drop.
	 * @param state New state.
	 */
	function applyState(state: PrupruState): void {
		currentState = state;
		if (draggedItem) {
			return;
		}
		render();
	}

	toggleButton.addEventListener('click', () => {
		void window.prupru.setSidebarCollapsed(!currentState.sidebarCollapsed);
	});
	enableSidebarResizing(sidebarResizer);
	bellButton.addEventListener('click', () => void openModal(buildDoNotDisturbModal));
	settingsButton.addEventListener('click', () => void openModal(buildSettingsModal));
	newFolderButton.addEventListener('click', () => void openModal(buildNewFolderModal));
	wakeButton.addEventListener('click', () => {
		if (currentState.activeId) {
			void window.prupru.selectAccount(currentState.activeId);
		}
	});
	for (const button of addButtons) {
		button.addEventListener('click', () => void openModal(buildAddModal));
	}
	modalBackdrop.addEventListener('click', closeModal);
	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') {
			closeModal();
		}
	});

	window.prupru.onStateChanged(applyState);
	void window.prupru.getState().then(applyState);
}

initializeSidebar();
