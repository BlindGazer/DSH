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
} from '../../src/index.ts';
import dshGithubStyles from './dsh-github-styles.css?inline';
import galleryStyles from './style.module.css';

ensureCoreStyles('kalex-dsh-core-demo-styles', dshGithubStyles);

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
            <Tabs items={tabs} activeValue={tab} onChange={setTab} />
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
                                <IconButton size="standard" tooltip="Информация">
                                    <InfoIcon />
                                </IconButton>
                                <IconButton size="small" tooltip="Информация">
                                    <InfoIcon />
                                </IconButton>
                                <IconButton size="standard" tooltip="Настройки">
                                    <SettingsIcon />
                                </IconButton>
                            </div>
                            <CodeDisclosure
                                code={
                                    '<IconButton size="standard" tooltip="Информация"><InfoIcon /></IconButton>\n<IconButton size="small" tooltip="Информация"><InfoIcon /></IconButton>'
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
                                <TextField size="standard" value="Standard" onChange={() => undefined} />
                                <TextField size="small" value="Small" onChange={() => undefined} />
                                <ThemedSelect size="standard" options={options} value={selected} onChange={setSelected} />
                                <ThemedSelect size="small" options={options} value={selected} onChange={setSelected} />
                                <label className="field-label" htmlFor="demo-name">
                                    Название
                                </label>
                                <TextField id="demo-name" value="Пример значения" onChange={() => undefined} />
                                <ThemedSelect options={options} value={selected} onChange={setSelected} />
                            </div>
                        </article>
                        <article className="sample">
                            <h2>Checkbox</h2>
                            <div className="row">
                                <Checkbox checked={checked} onChange={setChecked} />
                            </div>
                            <CodeDisclosure code={'<Checkbox checked={checked} onChange={setChecked} />'} />
                            <h2>SwitchControl</h2>
                            <div className="row">
                                <SwitchControl checked={checked} onChange={setChecked} />
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
                                <Checkbox checked={checked} onChange={setChecked} />
                                <SwitchControl checked={checked} onChange={setChecked} />
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
                            <CodeDisclosure code={'<Tooltip content="Подсказка">\n  <Button>Навести</Button>\n</Tooltip>'} />
                            <h2>Popover</h2>
                            <CodeDisclosure code={'<Popover content="Текст">\n  <Button>Открыть</Button>\n</Popover>'} />
                            <div className="row">
                                <Tooltip content="Стандартная подсказка DSH">
                                    <Button variant="secondary">Tooltip</Button>
                                </Tooltip>
                                <Popover content="Текст можно выделить мышью">
                                    <Button variant="secondary">Popover</Button>
                                </Popover>
                                <Button onClick={() => setModalOpen(true)}>Открыть окно</Button>
                            </div>
                        </article>
                        <article className="sample">
                            <h2>Spinner</h2>
                            <CodeDisclosure code={'<Spinner size="standard" />\n<Spinner size="small" />'} />
                            <h2>ProgressBar</h2>
                            <CodeDisclosure code={'<ProgressBar />'} />
                            <h2>CircularProgress и LinearProgress</h2>
                            <CodeDisclosure
                                code={
                                    '<CircularProgress value={64} size="standard" />\n<CircularProgress value={64} size="small" />\n<LinearProgress value={64} size="standard" />\n<LinearProgress value={64} size="small" />'
                                }
                            />
                            <div className="stack">
                                <div className="row">
                                    <Spinner />
                                    <CircularProgress value={64} />
                                    <LinearProgress value={64} />
                                    <ProgressBar />
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
                                <Checkbox checked={false} onChange={() => undefined} disabled />
                                <SwitchControl checked={false} onChange={() => undefined} disabled />
                                <ThemedSelect options={options} value={selected} onChange={setSelected} disabled />
                                <TextField value="Недоступно" onChange={() => undefined} disabled />
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
            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Демо модального окна" closeLabel="Закрыть">
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
