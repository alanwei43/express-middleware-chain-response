<template>
  <div>
    <div v-for="(g, $index) in cityList" :key="$index">
      <h3>{{g.firstCharacter}}</h3>
      <ol>
        <li v-for="city in g.list" :key="city.Id">{{city.Name}}</li>
      </ol>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      cityList: []
    };
  },
  mounted() {
    this.loadCityList();
  },
  methods: {
    loadCityList() {
      fetch("/citylist")
        .then(response => response.json())
        .then(data => (this.cityList = data));
    }
  }
};
</script>

<style>
</style>