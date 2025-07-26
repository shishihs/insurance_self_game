<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
const handleClick = () => {
  count.value++
}
const resetCount = () => {
  count.value = 0
}
</script>

<template>
  <div class="app">
    <h1>人生充実ゲーム</h1>
    <p>Life Fulfillment - 生命保険を「人生の味方」として描く</p>
    <div class="card">
      <button type="button" @click="handleClick" class="ok-button">
        OK ({{ count }}回クリック)
      </button>
      <p>OKボタンを押すだけのシンプルなゲームです</p>
      <button type="button" @click="resetCount" class="reset-button">
        リセット
      </button>
    </div>
  </div>
</template>

<style scoped>
.app {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

h1 {
  font-size: 3em;
  line-height: 1.1;
  margin-bottom: 0.5rem;
}

.card {
  padding: 2em;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.25s;
  margin: 0.5em;
}

.ok-button {
  background-color: #646cff;
  color: white;
}

.ok-button:hover {
  background-color: #535bf2;
}

.reset-button {
  background-color: #e74c3c;
  color: white;
}

.reset-button:hover {
  background-color: #c0392b;
}

button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}

@media (prefers-color-scheme: light) {
  .ok-button {
    background-color: #4a90e2;
  }
  
  .ok-button:hover {
    background-color: #357abd;
  }
  
  .reset-button {
    background-color: #e74c3c;
  }
  
  .reset-button:hover {
    background-color: #c0392b;
  }
}
</style>