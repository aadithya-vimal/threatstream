/**
 * src/services/UserService.js
 * User & Group Management Service Layer
 */
import { UserRepository } from '../repositories/UserRepository';

export class UserService {
  constructor() {
    this.userRepository = new UserRepository();
  }

  async getUsers() {
    return await this.userRepository.getUsers();
  }
}

export default UserService;
