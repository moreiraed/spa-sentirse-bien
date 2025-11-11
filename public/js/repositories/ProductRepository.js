// public/js/repositories/ProductRepository.js
import { supabase } from '../core/supabase.js';

const TABLE_NAME = 'products';
const STORAGE_BUCKET = 'product-images';

class ProductRepository {

  /**
   * Obtiene productos filtrados, buscados y ordenados.
   * @param {object} filters - { searchTerm, filterType, filterCategory }
   */
  async getFiltered(filters = {}) {
    const { searchTerm, filterType, filterCategory } = filters;

    let query = supabase.from(TABLE_NAME).select('*');

    if (searchTerm) {
      query = query.ilike('name', `%${searchTerm}%`);
    }
    if (filterType) {
      query = query.eq('type', filterType);
    }
    if (filterCategory) {
      query = query.eq('category', filterCategory);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      console.error("Error en ProductRepository.getFiltered():", error);
      throw error;
    }
    return data;
  }

  /**
   * Obtiene los valores únicos de tipo y categoría.
   */
  async getUniqueTypesAndCategories() {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('type, category');
    
    if (error) {
      console.error("Error en ProductRepository.getUniqueTypesAndCategories():", error);
      throw error;
    }

    const types = [...new Set(data.map(p => p.type).filter(Boolean))];
    const categories = [...new Set(data.map(p => p.category).filter(Boolean))];
    
    return { types, categories };
  }

  /**
   * Obtiene un solo producto por su ID.
   */
  async getById(id) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error("Error en ProductRepository.getById():", error);
      throw error;
    }
    return data;
  }

  /**
   * Crea un nuevo producto.
   */
  async create(productData) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([productData])
      .select()
      .single();
      
    if (error) {
      console.error("Error en ProductRepository.create():", error);
      throw error;
    }
    return data;
  }

  /**
   * Actualiza un producto existente por su ID.
   */
  async update(id, productData) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(productData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error("Error en ProductRepository.update():", error);
      throw error;
    }
    return data;
  }

  /**
   * Elimina un producto por su ID.
   */
  async delete(id) {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error en ProductRepository.delete():", error);
      throw error;
    }
    return true;
  }

  /**
   * Sube un archivo de imagen al Storage.
   * @param {File} file - El archivo a subir.
   * @returns {Promise<string>} - La URL pública de la imagen subida.
   */
  async uploadImage(file) {
    if (!file) return null;

    const fileName = `product-${Date.now()}-${file.name}`;
    const filePath = `${fileName}`; 

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("Error en ProductRepository.uploadImage():", uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    if (!data || !data.publicUrl) {
      throw new Error("No se pudo obtener la URL pública después de la subida.");
    }
    
    return data.publicUrl;
  }
}

// Exportamos una única instancia (Singleton) para que toda la app use la misma
export const productRepository = new ProductRepository();