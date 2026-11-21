import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
    Button,
    Checkbox,
    CircularProgress,
    CodeDisclosure,
    CollectionAddButton,
    ensureCoreStyles,
    IconButton,
    InfoIcon,
    LinearProgress,
    listDshThemes,
    Modal,
    Popover,
    ProgressBar,
    RadioCardGroup,
    type SelectOption,
    SettingsIcon,
    Skeleton,
    Spinner,
    SwitchControl,
    Tabs,
    TextField,
    ThemedSelect,
    Tooltip
} from '../../src/index.js';
import dshGithubStyles from './dsh-github-styles.css';
import galleryStyles from './style.module.css';

void dshGithubStyles;
ensureCoreStyles();

const options: SelectOption[] = [
    { value: 'one', label: 'Первый вариант' },
    { value: 'two', label: 'Второй вариант' }
];
const radioOptions = [
    { value: 'alpha', label: 'Альфа', description: 'Первое значение' },
    { value: 'beta', label: 'Бета', description: 'Второе значение' }
] as const;
const tabs = [
    { value: 'components', label: 'Компоненты' },
    { value: 'states', label: 'Состояния' }
];

function ComponentGallery() {
    const [dark, setDark] = useState(false);
    const [checked, setChecked] = useState(true);
    const [selected, setSelected] = useState('one');
    const [tab, setTab] = useState('components');
    const [modalOpen, setModalOpen] = useState(false);
    const [radio, setRadio] = useState('alpha');

    useEffect(() => {
        document.body.toggleAttribute('data-ds-dark-theme', dark);
        document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
        return () => {
            document.body.removeAttribute('data-ds-dark-theme');
            document.documentElement.style.removeProperty('color-scheme');
        };
    }, [dark]);

    return (
        <main className={`dsh-core-root ${galleryStyles.gallery}`} data-theme={dark ? 'dark' : 'light'}>
            <header className="gallery-header">
                <div>
                    <p className="eyebrow">@kalex/dsh-core</p>
                    <h1>Component gallery</h1>
                    <p>Компоненты дизайн-системы в двух темах</p>
                </div>
                <Button onClick={() => setDark(!dark)}>{dark ? 'Светлая тема' : 'Темная тема'}</Button>
            </header>
            <div className="gallery-summary">{listDshThemes().length} тем зарегистрировано в Core</div>
            <Tabs items={tabs} activeValue={tab} onChange={setTab} ariaLabel="Раздел галереи" />
            <section className="gallery-grid">
                {tab === 'components' ? (
                    <>
                        <article className="sample">
                            <h2>CollectionAddButton</h2>
                            <CollectionAddButton onClick={() => setModalOpen(true)}>Добавить элемент</CollectionAddButton>
                            <CodeDisclosure code={'<CollectionAddButton>Добавить</CollectionAddButton>'} />
                        </article>
                        <article className="sample">
                            <h2>Button</h2>
                            <div className="row">
                                <Button variant="primary" size="standard">
                                    Основная
                                </Button>
                                <Button variant="primary" size="small">
                                    Компактная
                                </Button>
                            </div>
                            <CodeDisclosure
                                code={
                                    '<Button variant="primary" size="standard">Основная</Button>\n<Button variant="primary" size="small">Компактная</Button>'
                                }
                            />
                            <h2>IconButton</h2>
                            <div className="row">
                                <IconButton size="standard" ariaLabel="Информация">
                                    <InfoIcon />
                                </IconButton>
                                <IconButton size="small" ariaLabel="Информация">
                                    <InfoIcon />
                                </IconButton>
                                <IconButton size="standard" ariaLabel="Настройки">
                                    <SettingsIcon />
                                </IconButton>
                            </div>
                            <CodeDisclosure
                                code={
                                    '<IconButton size="standard" ariaLabel="Информация"><InfoIcon /></IconButton>\n<IconButton size="small" ariaLabel="Информация"><InfoIcon /></IconButton>'
                                }
                            />
                        </article>
                        <article className="sample">
                            <h2>TextField</h2>
                            <CodeDisclosure
                                code={
                                    '<TextField size="standard" value="Пример" onChange={setValue} />\n<TextField size="small" value="Компактное" onChange={setValue} />'
                                }
                            />
                            <h2>ThemedSelect</h2>
                            <CodeDisclosure
                                code={
                                    '<ThemedSelect size="standard" options={options} value={value} onChange={setValue} />\n<ThemedSelect size="small" options={options} value={value} onChange={setValue} />'
                                }
                            />
                            <div className="stack">
                                <TextField size="standard" ariaLabel="Стандартное поле" value="Standard" onChange={() => undefined} />
                                <TextField size="small" ariaLabel="Компактное поле" value="Small" onChange={() => undefined} />
                                <ThemedSelect
                                    size="standard"
                                    options={options}
                                    value={selected}
                                    onChange={setSelected}
                                    ariaLabel="Стандартный список"
                                />
                                <ThemedSelect
                                    size="small"
                                    options={options}
                                    value={selected}
                                    onChange={setSelected}
                                    ariaLabel="Компактный список"
                                />
                                <label className="field-label" htmlFor="demo-name">
                                    Название
                                </label>
                                <TextField id="demo-name" ariaLabel="Название" value="Пример значения" onChange={() => undefined} />
                                <ThemedSelect options={options} value={selected} onChange={setSelected} ariaLabel="Выбор варианта" />
                            </div>
                        </article>
                        <article className="sample">
                            <h2>Checkbox</h2>
                            <div className="row">
                                <Checkbox checked={checked} onChange={setChecked} ariaLabel="Флажок" />
                            </div>
                            <CodeDisclosure code={'<Checkbox checked={checked} onChange={setChecked} />'} />
                            <h2>SwitchControl</h2>
                            <div className="row">
                                <SwitchControl checked={checked} onChange={setChecked} ariaLabel="Переключатель" />
                            </div>
                            <CodeDisclosure code={'<SwitchControl checked={enabled} onChange={setEnabled} />'} />
                            <h2>RadioCardGroup</h2>
                            <div className="row">
                                <RadioCardGroup
                                    name="demo-choice"
                                    label="Выберите вариант"
                                    value={radio}
                                    onChange={setRadio}
                                    options={radioOptions}
                                />
                            </div>
                            <CodeDisclosure code={'<RadioCardGroup name="choice" label="Выбор" options={options} />'} />
                            <div className="row">
                                <Checkbox checked={checked} onChange={setChecked} ariaLabel="Флажок" />
                                <SwitchControl checked={checked} onChange={setChecked} ariaLabel="Переключатель" />
                                <RadioCardGroup
                                    name="demo-choice"
                                    label="Выберите вариант"
                                    value={radio}
                                    onChange={setRadio}
                                    options={radioOptions}
                                />
                            </div>
                        </article>
                        <article className="sample">
                            <h2>Tooltip</h2>
                            <CodeDisclosure
                                code={'<Tooltip triggerLabel="Помощь" content="Подсказка">\n  <Button>Навести</Button>\n</Tooltip>'}
                            />
                            <h2>Popover</h2>
                            <CodeDisclosure
                                code={'<Popover triggerLabel="Детали" content="Текст">\n  <Button>Открыть</Button>\n</Popover>'}
                            />
                            <div className="row">
                                <Tooltip triggerLabel="Tooltip" content="Стандартная подсказка DSH">
                                    <Button variant="secondary">Tooltip</Button>
                                </Tooltip>
                                <Popover triggerLabel="Popover" content="Текст можно выделить мышью" contentLabel="Popover">
                                    <Button variant="secondary">Popover</Button>
                                </Popover>
                                <Button onClick={() => setModalOpen(true)}>Открыть окно</Button>
                            </div>
                        </article>
                        <article className="sample">
                            <h2>Spinner</h2>
                            <CodeDisclosure
                                code={
                                    '<Spinner size="standard" aria-label="Загрузка" />\n<Spinner size="small" aria-label="Компактная загрузка" />'
                                }
                            />
                            <h2>ProgressBar</h2>
                            <CodeDisclosure code={'<ProgressBar label="Загрузка страницы" />'} />
                            <h2>CircularProgress и LinearProgress</h2>
                            <CodeDisclosure
                                code={
                                    '<CircularProgress value={64} size="standard" label="Прогресс" />\n<CircularProgress value={64} size="small" label="Компактный прогресс" />\n<LinearProgress value={64} size="standard" label="Прогресс" />\n<LinearProgress value={64} size="small" label="Компактный прогресс" />'
                                }
                            />
                            <div className="stack">
                                <div className="row">
                                    <Spinner />
                                    <CircularProgress value={64} label="Прогресс 64%" />
                                    <LinearProgress value={64} label="Загрузка" />
                                    <ProgressBar label="Загрузка страницы" />
                                </div>
                                <Skeleton height={14} />
                            </div>
                        </article>
                    </>
                ) : (
                    <>
                        <article className="sample">
                            <h2>Отключенные элементы</h2>
                            <div className="row">
                                <Button disabled>Кнопка</Button>
                                <Checkbox checked={false} onChange={() => undefined} ariaLabel="Отключенный флажок" disabled />
                                <SwitchControl checked={false} onChange={() => undefined} ariaLabel="Отключенный переключатель" disabled />
                                <ThemedSelect
                                    options={options}
                                    value={selected}
                                    onChange={setSelected}
                                    ariaLabel="Отключенный список"
                                    disabled
                                />
                                <TextField ariaLabel="Отключенное поле" value="Недоступно" onChange={() => undefined} disabled />
                            </div>
                        </article>
                        <article className="sample">
                            <h2>Кнопки действий</h2>
                            <div className="row">
                                <Button variant="primary">Сохранить</Button>
                                <Button variant="danger">Удалить</Button>
                            </div>
                        </article>
                    </>
                )}
            </section>
            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Демо модального окна"
                theme={dark ? 'dark' : 'light'}
                closeLabel="Закрыть">
                <p className="modal-copy">Окно использует тему, выбранную в галерее.</p>
            </Modal>
        </main>
    );
}

const root = document.getElementById('root');
if (root)
    createRoot(root).render(
        <StrictMode>
            <ComponentGallery />
        </StrictMode>
    );
