import { useEffect, useMemo, useState } from 'react';

const storageKey = 'pokopia-progress-v1';

const starterTodos = [
  { id: 'daily-shop', title: '오늘 가게 확인하기', group: '매일 하기' },
  { id: 'daily-gift', title: '오늘 받을 수 있는 선물 확인하기', group: '매일 하기' },
  { id: 'befriend-one', title: '새 포켓몬 1마리와 친구 되기', group: '탐험' },
  { id: 'collect-wood', title: '나무나 돌 같은 재료 모으기', group: '재료' },
  { id: 'build-habitat', title: '새 서식지나 집 꾸미기', group: '건설' },
  { id: 'cook-food', title: '포켓몬이 좋아할 음식 만들기', group: '요리' },
  { id: 'clean-island', title: '섬을 예쁘게 정리하기', group: '꾸미기' },
  { id: 'write-note', title: '오늘 한 일을 한 줄로 적기', group: '기록' },
];

const pokemonTargets = [
  { name: 'pikachu', goal: '친구가 되었나요?' },
  { name: 'bulbasaur', goal: '풀 관련 일을 도와주나요?' },
  { name: 'squirtle', goal: '물을 뿌리는 일을 해봤나요?' },
  { name: 'charmander', goal: '불이 필요한 일을 해봤나요?' },
  { name: 'eevee', goal: '섬에서 만났나요?' },
  { name: 'snorlax', goal: '먹을 것을 챙겨줬나요?' },
];

function getSavedProgress() {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    return JSON.parse(window.localStorage.getItem(storageKey)) || {};
  } catch {
    return {};
  }
}

function getKoreanName(species) {
  return species.names?.find((item) => item.language.name === 'ko')?.name || species.name;
}

function getKoreanType(type) {
  const fallback = {
    electric: '전기',
    fire: '불꽃',
    grass: '풀',
    normal: '노말',
    poison: '독',
    water: '물',
  };

  return fallback[type] || type;
}

export default function PokopiaPage() {
  const [checked, setChecked] = useState({});
  const [note, setNote] = useState('');
  const [customText, setCustomText] = useState('');
  const [customTodos, setCustomTodos] = useState([]);
  const [pokemonInfo, setPokemonInfo] = useState([]);
  const [apiState, setApiState] = useState('loading');

  useEffect(() => {
    const saved = getSavedProgress();
    setChecked(saved.checked || {});
    setNote(saved.note || '');
    setCustomTodos(saved.customTodos || []);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ checked, note, customTodos })
    );
  }, [checked, note, customTodos]);

  useEffect(() => {
    let ignore = false;

    async function loadPokemon() {
      setApiState('loading');

      try {
        const results = await Promise.all(
          pokemonTargets.map(async (target) => {
            const pokemonResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${target.name}`);
            const pokemon = await pokemonResponse.json();
            const speciesResponse = await fetch(pokemon.species.url);
            const species = await speciesResponse.json();

            return {
              id: pokemon.id,
              name: getKoreanName(species),
              apiName: pokemon.name,
              image: pokemon.sprites.other?.['official-artwork']?.front_default || pokemon.sprites.front_default,
              types: pokemon.types.map((item) => getKoreanType(item.type.name)),
              goal: target.goal,
            };
          })
        );

        if (!ignore) {
          setPokemonInfo(results);
          setApiState('ready');
        }
      } catch {
        if (!ignore) {
          setPokemonInfo([]);
          setApiState('error');
        }
      }
    }

    loadPokemon();

    return () => {
      ignore = true;
    };
  }, []);

  const allTodos = useMemo(() => [...starterTodos, ...customTodos], [customTodos]);
  const completedCount = allTodos.filter((todo) => checked[todo.id]).length;
  const progress = allTodos.length === 0 ? 0 : Math.round((completedCount / allTodos.length) * 100);

  function toggleTodo(id) {
    setChecked((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  function addCustomTodo(event) {
    event.preventDefault();
    const title = customText.trim();

    if (!title) {
      return;
    }

    setCustomTodos((current) => [
      ...current,
      { id: `custom-${Date.now()}`, title, group: '내가 만든 할 일' },
    ]);
    setCustomText('');
  }

  function resetToday() {
    setChecked({});
    setNote('');
  }

  return (
    <section className="pokopiaPage">
      <div className="pokopiaHero">
        <div>
          <p>Pokopia Tracker</p>
          <h1>포코피아 진행표</h1>
          <span>외부 API로 포켓몬 정보를 보고, 오늘 할 일을 체크해요.</span>
        </div>
        <div className="progressBadge" aria-label={`진행률 ${progress}%`}>
          <strong>{progress}%</strong>
          <span>{completedCount} / {allTodos.length}</span>
        </div>
      </div>

      <div className="pokopiaProgress">
        <div className="progressTrack">
          <span style={{ width: `${progress}%` }} />
        </div>
        <button type="button" onClick={resetToday}>오늘 기록 지우기</button>
      </div>

      <div className="pokopiaLayout">
        <section className="todoPanel" aria-labelledby="todo-heading">
          <div className="panelHeader">
            <p>Todo List</p>
            <h2 id="todo-heading">오늘 할 일</h2>
          </div>

          <div className="todoList">
            {allTodos.map((todo) => (
              <label key={todo.id} className={checked[todo.id] ? 'todoItem done' : 'todoItem'}>
                <input
                  type="checkbox"
                  checked={Boolean(checked[todo.id])}
                  onChange={() => toggleTodo(todo.id)}
                />
                <span>{todo.title}</span>
                <em>{todo.group}</em>
              </label>
            ))}
          </div>

          <form className="todoForm" onSubmit={addCustomTodo}>
            <input
              type="text"
              value={customText}
              onChange={(event) => setCustomText(event.target.value)}
              placeholder="새 할 일 쓰기"
              aria-label="새 할 일"
            />
            <button type="submit">추가</button>
          </form>
        </section>

        <section className="apiPanel" aria-labelledby="api-heading">
          <div className="panelHeader">
            <p>External API</p>
            <h2 id="api-heading">PokéAPI 정보</h2>
          </div>

          {apiState === 'loading' && <p className="apiMessage">포켓몬 정보를 가져오는 중...</p>}
          {apiState === 'error' && <p className="apiMessage">API 연결이 안 돼서 정보를 가져오지 못했어요.</p>}

          <div className="pokemonGrid">
            {pokemonInfo.map((pokemon) => (
              <article key={pokemon.id} className="pokemonCard">
                <img src={pokemon.image} alt={pokemon.name} />
                <div>
                  <span>No. {pokemon.id}</span>
                  <h3>{pokemon.name}</h3>
                  <p>{pokemon.types.join(' / ')}</p>
                  <em>{pokemon.goal}</em>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="notePanel" aria-labelledby="note-heading">
          <div className="panelHeader">
            <p>Adventure Note</p>
            <h2 id="note-heading">오늘의 모험 일기</h2>
          </div>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="오늘 포코피아에서 무엇을 했나요?"
          />
        </section>
      </div>
    </section>
  );
}
